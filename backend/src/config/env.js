require('dotenv').config();

// Centraliza toda lectura de process.env en un solo lugar — antes cada archivo (helpers.js,
// whatsapp.js, cron.js) leía process.env directo en el punto de uso, lo que hacía difícil ver
// de un vistazo qué variables existen y volvía imposible tener config distinta por tenant más
// adelante (hoy sigue siendo global al proceso, un paso más allá sería DB-backed por tenant).

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} no está definido. Configúralo en las variables de entorno antes de iniciar el servidor.`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3001,
  host: process.env.HOST || '0.0.0.0',

  // URL interna del sistema principal, para validar las sesiones del personal (ver
  // middleware/auth.js). En Docker, ambos comparten la red mydents-net.
  mainApiUrl: (process.env.MAIN_API_URL || 'http://backend:3000').replace(/\/+$/, ''),

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379
  },

  metaGraphApiVersion: process.env.META_GRAPH_API_VERSION || 'v21.0',

  responseMode: process.env.RESPONSE_MODE || 'known_patients', // known_patients | keyword | all
  keywordTrigger: (process.env.KEYWORD_TRIGGER || 'PACIENTE').toUpperCase(),

  reminder24h: {
    hour: parseInt(process.env.REMINDER_24H_HOUR, 10) ?? 8,
    minute: parseInt(process.env.REMINDER_24H_MINUTE, 10) ?? 0
  },
  reminder3hEnabled: process.env.REMINDER_3H_ENABLED === 'true',

  clinic: {
    name: process.env.CLINIC_NAME || "Centro Odontológico MY DENT'S",
    address: process.env.CLINIC_ADDRESS || '',
    phone: process.env.CLINIC_PHONE || ''
  }
};

module.exports = env;
