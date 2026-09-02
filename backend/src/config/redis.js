const env = require('./env');

// maxRetriesPerRequest:null y enableReadyCheck:false son la config que BullMQ pide
// explícitamente para conexiones que usa — sin esto, BullMQ tira warnings/errores raros
// bajo carga o cuando Redis tarda en responder.
module.exports = {
  host: env.redis.host,
  port: env.redis.port,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};
