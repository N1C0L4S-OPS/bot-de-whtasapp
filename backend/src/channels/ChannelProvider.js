const { NotImplementedError } = require('./NotImplementedError');

/**
 * Interfaz que tiene que cumplir cada canal (WhatsApp, Messenger, Instagram, el que venga
 * después). Un provider nuevo agregado al registro (ver ./index.js) que no implemente algún
 * método hereda el throw de acá — así queda claro de inmediato qué falta, en vez de fallar
 * en silencio o con un error genérico de "no es una función".
 */
class ChannelProvider {
  /** @type {string} */
  static channelKey = null;

  /**
   * Maneja el handshake GET de verificación de webhook (hub.mode/hub.verify_token/hub.challenge
   * en Meta, o el equivalente de otra plataforma). Devuelve el string de challenge a responder,
   * o null si no coincide (el caller responde 403).
   * @param {Object} query
   * @param {string} expectedVerifyToken
   * @returns {string|null}
   */
  verifyWebhook(query, expectedVerifyToken) {
    throw new NotImplementedError(this.constructor.channelKey, 'verifyWebhook');
  }

  /**
   * Valida la firma del body crudo del webhook contra el secreto de la app/canal, para
   * confirmar que la entrega viene realmente de la plataforma y no de un tercero que le pegó
   * a la URL.
   * @param {Buffer} rawBody
   * @param {string} headerSignature
   * @param {string} appSecret
   * @returns {boolean}
   */
  verifySignature(rawBody, headerSignature, appSecret) {
    throw new NotImplementedError(this.constructor.channelKey, 'verifySignature');
  }

  /**
   * Convierte el payload crudo del webhook (POST) en mensajes y estados de entrega
   * normalizados. Es una función pura — no toca la base de datos ni encola nada, eso lo hace
   * quien la llama.
   * @param {Object} body
   * @returns {{ messages: import('./types').IncomingMessage[], statuses: import('./types').DeliveryStatus[] }}
   */
  parseIncomingWebhook(body) {
    throw new NotImplementedError(this.constructor.channelKey, 'parseIncomingWebhook');
  }

  /**
   * Envía un mensaje. channelConfig trae las credenciales (token, external_account_id) de la
   * cuenta específica del tenant que está mandando — nunca se leen credenciales de env acá.
   * @param {import('./types').OutgoingMessage} outgoingMessage
   * @param {Object} channelConfig - fila de la tabla channel_configs
   * @returns {Promise<{ externalMessageId: string }>}
   */
  async sendMessage(outgoingMessage, channelConfig) {
    throw new NotImplementedError(this.constructor.channelKey, 'sendMessage');
  }

  /**
   * @param {string} externalMessageId
   * @param {Object} channelConfig
   * @returns {Promise<void>}
   */
  async markAsRead(externalMessageId, channelConfig) {
    throw new NotImplementedError(this.constructor.channelKey, 'markAsRead');
  }
}

module.exports = { ChannelProvider };
