require('dotenv').config();

const env = require('./config/env');
const db = require('./config/db');
const app = require('./app');
const { startInboundWorker } = require('./workers/inboundWorker');
const { startOutboundWorker } = require('./workers/outboundWorker');
const { startScheduler } = require('./scheduler/cron');

let server;
let inboundWorker;
// Solo WhatsApp tiene provider real hoy — arrancar un worker de salida para messenger/instagram
// no rompería nada (sus colas simplemente nunca reciben jobs hasta la Fase 3), pero tampoco
// aporta nada; se suma acá cuando se implementen esos providers.
let outboundWorkers = [];

async function start() {
  // Falla rápido y con un mensaje claro si la base no responde, en vez de que el primer
  // request random sea el que lo descubra.
  await db.raw('SELECT 1');
  console.log(`Conectado a la base de datos (${env.nodeEnv}).`);

  inboundWorker = startInboundWorker();
  outboundWorkers = [startOutboundWorker('whatsapp')];
  startScheduler();

  server = app.listen(env.port, env.host, () => {
    console.log(`Bot de mensajería escuchando en http://${env.host}:${env.port}`);
  });
}

// Apagado ordenado: el bot viejo no tenía nada de esto — un SIGTERM (el que manda Docker al
// parar un contenedor) lo mataba en seco, cortando conexiones a mitad de un request o de un
// job de BullMQ en curso.
async function shutdown(signal) {
  console.log(`${signal} recibido, cerrando...`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (inboundWorker) await inboundWorker.close();
  await Promise.all(outboundWorkers.map((w) => w.close()));
  await db.destroy();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Promesa rechazada sin capturar:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
});

start().catch((err) => {
  console.error('No se pudo iniciar el bot:', err);
  process.exit(1);
});
