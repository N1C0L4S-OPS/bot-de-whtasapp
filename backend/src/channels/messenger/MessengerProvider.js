const { MetaGraphChannelProvider } = require('../MetaGraphChannelProvider');
const { NotImplementedError } = require('../NotImplementedError');

/**
 * Stub — Messenger Platform API. verifyWebhook/verifySignature ya funcionan (heredados de
 * MetaGraphChannelProvider, son idénticos entre canales de Meta). Falta implementar el
 * parseo del payload de Messenger (forma distinta a la de WhatsApp: `sender.id`/`recipient.id`
 * en vez de `from`/metadata.phone_number_id) y el armado del mensaje saliente para
 * /me/messages. Completar esto es el trabajo de la Fase 3 del plan, no un rediseño.
 */
class MessengerProvider extends MetaGraphChannelProvider {
  static channelKey = 'messenger';

  parseIncomingWebhook(body) {
    throw new NotImplementedError(MessengerProvider.channelKey, 'parseIncomingWebhook');
  }

  async sendMessage(outgoingMessage, channelConfig) {
    throw new NotImplementedError(MessengerProvider.channelKey, 'sendMessage');
  }

  async markAsRead(externalMessageId, channelConfig) {
    throw new NotImplementedError(MessengerProvider.channelKey, 'markAsRead');
  }
}

module.exports = { MessengerProvider };
