const { getProvider } = require('../../../channels');
const { inboundQueue } = require('../../../queues/inboundQueue');
const { db } = require('../../../db/scope');

const webhooksController = {
  // GET — handshake de verificación. No hace falta autenticación de firma acá: Meta solo
  // manda hub.mode/hub.verify_token/hub.challenge, y el verify_token en sí YA es el secreto
  // que confirma que quien configura el webhook es el dueño legítimo de la cuenta.
  async verify(req, res) {
    const { channel } = req.params;
    let provider;
    try {
      provider = getProvider(channel);
    } catch {
      return res.status(404).send('Canal desconocido.');
    }

    const configs = await db('channel_configs').where({ channel, status: 'active' });
    for (const config of configs) {
      const challenge = provider.verifyWebhook(req.query, config.verify_token);
      if (challenge !== null) {
        return res.status(200).send(challenge);
      }
    }
    return res.status(403).send('Verificación fallida.');
  },

  // POST — receptor delgado a propósito: verifica firma, normaliza, encola, responde 200 de
  // inmediato. CERO lógica de negocio acá — eso es exactamente el problema #1 del bot viejo
  // (todo adentro del handler del webhook). El worker de inbound-processing hace el resto.
  async receive(req, res) {
    const { channel } = req.params;
    let provider;
    try {
      provider = getProvider(channel);
    } catch {
      return res.status(404).json({ error: 'Canal desconocido.' });
    }

    const configs = await db('channel_configs').where({ channel, status: 'active' });
    const signature = req.headers['x-hub-signature-256'];
    const configsWithSecret = configs.filter((c) => c.app_secret);

    if (configsWithSecret.length > 0) {
      const signatureValid = configsWithSecret.some((c) =>
        provider.verifySignature(req.rawBody, signature, c.app_secret)
      );
      if (!signatureValid) {
        return res.status(401).json({ error: 'Firma inválida.' });
      }
    } else {
      console.warn(`Ningún channel_config de '${channel}' tiene app_secret configurado — se omite verificación de firma (solo debería pasar en desarrollo local).`);
    }

    // Responder rápido es un requisito de Meta, no un detalle de estilo — si tarda, reintenta
    // la entrega y se pueden duplicar mensajes (por eso el dedup en messages también importa).
    res.status(200).send('EVENT_RECEIVED');

    try {
      const { messages, statuses } = provider.parseIncomingWebhook(req.body);
      for (const message of messages) {
        await inboundQueue.add('incoming-message', message);
      }
      for (const status of statuses) {
        await inboundQueue.add('delivery-status', status);
      }
    } catch (err) {
      // Ya respondimos 200, así que esto no puede propagarse como error HTTP — solo loguear.
      console.error(`Error procesando webhook de ${channel}:`, err);
    }
  }
};

module.exports = { webhooksController };
