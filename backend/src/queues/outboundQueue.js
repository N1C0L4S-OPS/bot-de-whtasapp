const { Queue } = require('bullmq');
const redisConfig = require('../config/redis');
const { CHANNEL_KEYS } = require('../channels');

// Una cola BullMQ POR CANAL (no una compartida) — así el límite de tasa de cada plataforma
// se puede ajustar de forma independiente sin que un canal lento frene a los demás. El
// bot viejo tenía una sola cola 'whatsapp-outbound' porque solo existía un canal.
const queues = {};
for (const channel of CHANNEL_KEYS) {
  queues[channel] = new Queue(`${channel}-outbound`, {
    connection: redisConfig,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500
    }
  });
}

/**
 * @param {string} channel
 * @returns {Queue}
 */
function getOutboundQueue(channel) {
  const queue = queues[channel];
  if (!queue) throw new Error(`No hay cola de salida para el canal '${channel}'.`);
  return queue;
}

module.exports = { getOutboundQueue, outboundQueues: queues };
