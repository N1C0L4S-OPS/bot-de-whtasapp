const Redis = require('ioredis');
const redisConfig = require('../config/redis');

const redis = new Redis(redisConfig);

/**
 * Lock simple por Redis (SET NX EX) para que, si el proceso llegara a correr en más de una
 * instancia (escalado horizontal), los cron jobs no disparen el mismo recordatorio dos veces.
 * El bot viejo no tenía ninguna protección para esto pese a tener Redis disponible.
 *
 * No se borra la key al terminar a propósito: se deja expirar sola por TTL — así, si el
 * proceso se cae a mitad de la tarea, no queda un lock huérfano bloqueando la próxima corrida
 * para siempre.
 *
 * @param {string} lockKey
 * @param {number} ttlSeconds
 * @param {() => Promise<void>} fn
 */
async function withLock(lockKey, ttlSeconds, fn) {
  const acquired = await redis.set(lockKey, '1', 'NX', 'EX', ttlSeconds);
  if (!acquired) {
    console.log(`Lock '${lockKey}' ya tomado por otra instancia — se salta esta corrida.`);
    return;
  }
  await fn();
}

module.exports = { withLock };
