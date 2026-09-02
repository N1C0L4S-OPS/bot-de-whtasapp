const { Worker } = require('bullmq');
const redisConfig = require('../config/redis');
const { getProvider } = require('../channels');
const { db } = require('../db/scope');

// Límites de tasa conocidos por canal — generalización del limiter que ya traía el
// whatsappWorker.js viejo (concurrency:5, max:30/1s, que respeta el tope real de WhatsApp
// Cloud API). Messenger/Instagram quedan con un default conservador hasta que se midan sus
// límites reales al implementarlos en la Fase 3.
const RATE_LIMITS = {
  whatsapp: { concurrency: 5, limiter: { max: 30, duration: 1000 } },
  messenger: { concurrency: 5, limiter: { max: 20, duration: 1000 } },
  instagram: { concurrency: 5, limiter: { max: 20, duration: 1000 } }
};

async function processOutboundMessage(channel, job) {
  const { channelConfigId, conversationId, tenantId, externalContactId, text, scheduledSendId } = job.data;

  const channelConfig = await db('channel_configs').where({ id: channelConfigId }).first();
  const provider = getProvider(channel);

  // Un mismo job puede correr varias veces por los reintentos de BullMQ (attempts:3 con
  // backoff). Sin esto, cada reintento insertaba una fila nueva en `messages` — un mensaje
  // que falla 3 veces aparecía 3 veces en la conversación. Ahora se inserta UNA vez, en el
  // primer intento, y los reintentos actualizan esa misma fila (el id queda guardado en el
  // propio job vía updateData, así sobrevive entre intentos).
  let messageId = job.data.messageId;
  if (!messageId) {
    const [inserted] = await db('messages')
      .insert({
        tenant_id: tenantId,
        conversation_id: conversationId,
        direction: 'outbound',
        channel,
        body_text: text,
        message_type: 'text',
        status: 'queued'
      })
      .returning('id');
    messageId = inserted.id ?? inserted;
    await job.updateData({ ...job.data, messageId });
  }

  try {
    const { externalMessageId } = await provider.sendMessage(
      { channel, externalContactId, text, type: 'text' },
      channelConfig
    );

    await db('messages').where({ id: messageId }).update({
      external_message_id: externalMessageId || null,
      status: 'sent',
      error_message: null,
      updated_at: db.fn.now()
    });

    if (scheduledSendId) {
      await db('scheduled_sends').where({ id: scheduledSendId }).update({ status: 'sent', sent_at: db.fn.now() });
    }
  } catch (err) {
    await db('messages').where({ id: messageId }).update({
      status: 'failed',
      error_message: err.message,
      updated_at: db.fn.now()
    });
    if (scheduledSendId) {
      await db('scheduled_sends').where({ id: scheduledSendId }).update({ status: 'failed', error_message: err.message });
    }
    throw err; // re-lanza para que BullMQ reintente según defaultJobOptions de la cola
  }
}

/**
 * @param {string} channel
 * @returns {Worker}
 */
function startOutboundWorker(channel) {
  const { concurrency, limiter } = RATE_LIMITS[channel] || { concurrency: 3, limiter: { max: 10, duration: 1000 } };

  const worker = new Worker(
    `${channel}-outbound`,
    (job) => processOutboundMessage(channel, job),
    { connection: redisConfig, concurrency, limiter }
  );

  worker.on('failed', (job, err) => {
    console.error(`Envío saliente falló (${channel}, intento ${job?.attemptsMade}):`, err.message);
  });

  return worker;
}

module.exports = { startOutboundWorker };
