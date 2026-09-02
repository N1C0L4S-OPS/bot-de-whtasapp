const { db } = require('../db/scope');

/**
 * Resuelve a qué tenant/canal pertenece un mensaje entrante, a partir del id de cuenta que
 * lo recibió (phone_number_id / page_id / ig_user_id). Es el primer paso de todo el pipeline
 * de entrada: un webhook de Meta llega sin ningún contexto de tenant más que este id.
 * @param {string} channel
 * @param {string} externalAccountId
 */
async function resolveChannelConfig(channel, externalAccountId) {
  const channelConfig = await db('channel_configs')
    .where({ channel, external_account_id: externalAccountId, status: 'active' })
    .first();
  if (!channelConfig) {
    throw new Error(`No hay channel_config activo para ${channel}/${externalAccountId}.`);
  }
  return channelConfig;
}

/**
 * find-or-create atómico de un contacto, vía ON CONFLICT en vez del find-then-create manual
 * (no atómico, con condición de carrera bajo webhooks concurrentes) que tenía el bot viejo.
 * @param {Object} params
 * @param {number} params.tenantId
 * @param {string} params.channel
 * @param {string} params.externalContactId
 * @param {string} [params.displayName]
 * @param {string} [params.phone]
 */
async function upsertContact({ tenantId, channel, externalContactId, displayName, phone }) {
  const [contact] = await db('contacts')
    .insert({
      tenant_id: tenantId,
      channel,
      external_contact_id: externalContactId,
      display_name: displayName || null,
      phone: phone || null,
      first_seen_at: db.fn.now(),
      last_seen_at: db.fn.now()
    })
    .onConflict(['tenant_id', 'channel', 'external_contact_id'])
    .merge({
      // display_name puede llegar más completo en un mensaje posterior (WhatsApp a veces no
      // manda el profile.name en cada webhook) — solo lo pisamos si el nuevo valor no es nulo.
      display_name: displayName || db.raw('contacts.display_name'),
      last_seen_at: db.fn.now()
    })
    .returning('*');
  return contact;
}

/**
 * find-or-create atómico de una conversación, misma lógica ON CONFLICT.
 * @param {Object} params
 * @param {number} params.tenantId
 * @param {number} params.channelConfigId
 * @param {number} params.contactId
 */
async function upsertConversation({ tenantId, channelConfigId, contactId }) {
  const [conversation] = await db('conversations')
    .insert({
      tenant_id: tenantId,
      channel_config_id: channelConfigId,
      contact_id: contactId,
      status: 'open',
      last_message_at: db.fn.now()
    })
    .onConflict(['channel_config_id', 'contact_id'])
    .merge({
      last_message_at: db.fn.now(),
      // si estaba cerrada y el contacto vuelve a escribir, la reabrimos
      status: 'open'
    })
    .returning('*');
  return conversation;
}

/**
 * Inserta un mensaje. El índice único parcial de la migración (channel, external_message_id)
 * hace que un reintento de webhook de Meta para el mismo mensaje no lo duplique — acá se
 * detecta ese caso específico (código 23505 de Postgres = unique_violation) y se lo trata
 * como éxito silencioso, no como error real.
 * @param {Object} params
 */
async function insertMessage({ tenantId, conversationId, direction, channel, externalMessageId, bodyText, messageType, status, rawPayload }) {
  try {
    const [message] = await db('messages')
      .insert({
        tenant_id: tenantId,
        conversation_id: conversationId,
        direction,
        channel,
        external_message_id: externalMessageId || null,
        body_text: bodyText || null,
        message_type: messageType || 'text',
        status: status || 'received',
        raw_payload: rawPayload ? JSON.stringify(rawPayload) : null
      })
      .returning('*');
    return { message, wasDuplicate: false };
  } catch (err) {
    if (err.code === '23505') {
      return { message: null, wasDuplicate: true };
    }
    throw err;
  }
}

async function updateMessageStatus(channel, externalMessageId, status, errorMessage) {
  return db('messages')
    .where({ channel, external_message_id: externalMessageId })
    .update({ status, error_message: errorMessage || null, updated_at: db.fn.now() });
}

module.exports = {
  resolveChannelConfig,
  upsertContact,
  upsertConversation,
  insertMessage,
  updateMessageStatus
};
