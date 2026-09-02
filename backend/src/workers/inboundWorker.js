const { Worker } = require('bullmq');
const redisConfig = require('../config/redis');
const { getProvider } = require('../channels');
const { getOutboundQueue } = require('../queues/outboundQueue');
const conversationService = require('../services/conversationService');
const { handleInboundMessage } = require('../services/inboundMessageHandler');

async function processIncomingMessage(incomingMessage) {
  const channelConfig = await conversationService.resolveChannelConfig(
    incomingMessage.channel,
    incomingMessage.externalAccountId
  );
  const tenantId = channelConfig.tenant_id;

  const contact = await conversationService.upsertContact({
    tenantId,
    channel: incomingMessage.channel,
    externalContactId: incomingMessage.externalContactId,
    displayName: incomingMessage.contactDisplayName,
    // Para WhatsApp el id de contacto (wa_id) ES el teléfono. Para Messenger/Instagram (a
    // futuro) no lo es, así que esto se ajusta cuando se implementen esos providers.
    phone: incomingMessage.channel === 'whatsapp' ? incomingMessage.externalContactId : null
  });

  const conversation = await conversationService.upsertConversation({
    tenantId,
    channelConfigId: channelConfig.id,
    contactId: contact.id
  });

  const { wasDuplicate } = await conversationService.insertMessage({
    tenantId,
    conversationId: conversation.id,
    direction: 'inbound',
    channel: incomingMessage.channel,
    externalMessageId: incomingMessage.externalMessageId,
    bodyText: incomingMessage.text,
    messageType: incomingMessage.type,
    status: 'received',
    rawPayload: incomingMessage.raw
  });

  if (wasDuplicate) {
    console.log(`Mensaje duplicado ignorado (${incomingMessage.channel}/${incomingMessage.externalMessageId}) — reintento de webhook.`);
    return;
  }

  // Best-effort: si marcar como leído falla, no queremos que todo el job reintente por eso.
  try {
    const provider = getProvider(incomingMessage.channel);
    await provider.markAsRead(incomingMessage.externalMessageId, channelConfig);
  } catch (err) {
    console.error('No se pudo marcar como leído:', err.message);
  }

  const replyText = await handleInboundMessage(incomingMessage, contact, tenantId);
  if (!replyText) return;

  await getOutboundQueue(incomingMessage.channel).add('send-message', {
    channel: incomingMessage.channel,
    channelConfigId: channelConfig.id,
    conversationId: conversation.id,
    tenantId,
    externalContactId: incomingMessage.externalContactId,
    text: replyText
  });
}

async function processDeliveryStatus(status) {
  await conversationService.updateMessageStatus(status.channel, status.externalMessageId, status.status, status.errorMessage);
}

function startInboundWorker() {
  const worker = new Worker(
    'inbound-processing',
    async (job) => {
      if (job.name === 'incoming-message') return processIncomingMessage(job.data);
      if (job.name === 'delivery-status') return processDeliveryStatus(job.data);
      console.warn(`Job de tipo desconocido en inbound-processing: ${job.name}`);
    },
    { connection: redisConfig, concurrency: 10 }
  );

  worker.on('failed', (job, err) => {
    console.error(`Job de entrada falló (${job?.name}, intento ${job?.attemptsMade}):`, err.message);
  });

  return worker;
}

module.exports = { startInboundWorker };
