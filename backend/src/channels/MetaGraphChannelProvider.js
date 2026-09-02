const crypto = require('crypto');
const axios = require('axios');
const { ChannelProvider } = require('./ChannelProvider');
const env = require('../config/env');

const GRAPH_BASE_URL = 'https://graph.facebook.com';
const GRAPH_API_VERSION = env.metaGraphApiVersion;

/**
 * Base compartida para WhatsApp Cloud API, Messenger Platform e Instagram Messaging — los
 * tres son productos de la Graph API de Meta y comparten el mismo handshake de verificación
 * de webhook, el mismo esquema de firma (X-Hub-Signature-256) y el mismo patrón de POST a
 * graph.facebook.com/{version}/{id}/{endpoint}. Cada canal solo difiere en el endpoint exacto
 * y en la forma del payload de entrada/salida — eso lo define cada subclase.
 */
class MetaGraphChannelProvider extends ChannelProvider {
  verifyWebhook(query, expectedVerifyToken) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === expectedVerifyToken) {
      return challenge;
    }
    return null;
  }

  verifySignature(rawBody, headerSignature, appSecret) {
    if (!headerSignature || !appSecret) return false;

    const expected = 'sha256=' + crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    // timingSafeEqual evita que un atacante deduzca la firma correcta byte a byte midiendo
    // cuánto tarda en responder una comparación string === string normal.
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(headerSignature);
    if (expectedBuffer.length !== receivedBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  /**
   * POST genérico a la Graph API, común a los tres canales.
   * @param {string} externalAccountId - phone_number_id / page_id / ig_user_id
   * @param {string} accessToken
   * @param {Object} payload
   * @param {string} [endpoint='messages']
   */
  async postToGraph(externalAccountId, accessToken, payload, endpoint = 'messages') {
    const url = `${GRAPH_BASE_URL}/${GRAPH_API_VERSION}/${externalAccountId}/${endpoint}`;
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }
}

module.exports = { MetaGraphChannelProvider, GRAPH_API_VERSION };
