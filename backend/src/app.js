const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());

// Origen acotado a la URL del panel admin (frontend/) en vez de cors() abierto a cualquiera,
// que es como estaba el bot viejo — filtraba nombres/teléfonos/mensajes de pacientes a
// cualquier sitio que hiciera un fetch.
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  credentials: true
}));

app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// verify captura el body crudo en req.rawBody antes de parsearlo — lo necesita la
// verificación de firma (X-Hub-Signature-256) de los webhooks de Meta, que tiene que
// calcularse sobre los bytes exactos que mandó Meta, no sobre el JSON re-serializado.
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Demasiadas peticiones. Intenta de nuevo en 15 minutos.' }
});
app.use('/api', apiLimiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: env.nodeEnv });
});

app.use('/webhooks', require('./modules/webhooks/routes'));

// El resto de los módulos admin (conversations, stats, config) se montan acá cuando se
// construyan (Fase 2 — panel gráfico).

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

app.use(errorHandler);

module.exports = app;
