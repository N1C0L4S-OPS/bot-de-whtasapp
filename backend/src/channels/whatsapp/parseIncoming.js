/**
 * Convierte el payload crudo de un webhook de WhatsApp Cloud API en mensajes y estados de
 * entrega normalizados. A diferencia del webhookController viejo, recorre TODAS las entries/
 * changes/messages/statuses del payload (Meta puede mandar más de uno por webhook), no solo
 * `messages[0]`.
 *
 * @param {Object} body
 * @returns {{ messages: import('../types').IncomingMessage[], statuses: import('../types').DeliveryStatus[] }}
 */
function parseIncoming(body) {
  const messages = [];
  const statuses = [];

  if (body?.object !== 'whatsapp_business_account') {
    return { messages, statuses };
  }

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value) continue;

      const externalAccountId = value.metadata?.phone_number_id;
      const contactsByWaId = Object.fromEntries(
        (value.contacts || []).map((c) => [c.wa_id, c.profile?.name])
      );

      for (const msg of value.messages || []) {
        messages.push(normalizeMessage(msg, externalAccountId, contactsByWaId[msg.from]));
      }

      for (const status of value.statuses || []) {
        statuses.push({
          channel: 'whatsapp',
          externalMessageId: status.id,
          status: mapStatus(status.status),
          errorMessage: status.errors?.[0]?.title,
          timestamp: new Date(parseInt(status.timestamp, 10) * 1000)
        });
      }
    }
  }

  return { messages, statuses };
}

function normalizeMessage(msg, externalAccountId, contactDisplayName) {
  const base = {
    channel: 'whatsapp',
    externalAccountId,
    externalContactId: msg.from,
    externalMessageId: msg.id,
    contactDisplayName,
    timestamp: new Date(parseInt(msg.timestamp, 10) * 1000),
    raw: msg
  };

  if (msg.type === 'text') {
    return { ...base, type: 'text', text: msg.text?.body || '', interactivePayload: null };
  }

  if (msg.type === 'button') {
    // Respuesta a un botón de plantilla (quick reply clásico)
    return { ...base, type: 'button', text: msg.button?.text || '', interactivePayload: msg.button?.payload || null };
  }

  if (msg.type === 'interactive') {
    const reply = msg.interactive?.button_reply || msg.interactive?.list_reply;
    return { ...base, type: 'interactive_reply', text: reply?.title || '', interactivePayload: reply?.id || null };
  }

  return { ...base, type: 'unsupported', text: '', interactivePayload: null };
}

function mapStatus(waStatus) {
  // WhatsApp usa los mismos nombres que nuestro enum interno salvo 'sent', que dejamos igual.
  if (['sent', 'delivered', 'read', 'failed'].includes(waStatus)) return waStatus;
  return 'sent';
}

module.exports = { parseIncoming };
