const { MetaGraphChannelProvider } = require('../MetaGraphChannelProvider');
const { NotImplementedError } = require('../NotImplementedError');

/**
 * Stub — Instagram Messaging API. Mismo caso que MessengerProvider: el handshake y la firma
 * ya funcionan (heredados), falta el parseo del payload propio de Instagram (`IGSID` en vez
 * de `wa_id`/PSID) y el envío. Fase 3 del plan.
 */
class InstagramProvider extends MetaGraphChannelProvider {
  static channelKey = 'instagram';

  parseIncomingWebhook(body) {
    throw new NotImplementedError(InstagramProvider.channelKey, 'parseIncomingWebhook');
  }

  async sendMessage(outgoingMessage, channelConfig) {
    throw new NotImplementedError(InstagramProvider.channelKey, 'sendMessage');
  }

  async markAsRead(externalMessageId, channelConfig) {
    throw new NotImplementedError(InstagramProvider.channelKey, 'markAsRead');
  }
}

module.exports = { InstagramProvider };
