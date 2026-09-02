const { MetaGraphChannelProvider } = require('../MetaGraphChannelProvider');
const { parseIncoming } = require('./parseIncoming');
const { formatOutgoing } = require('./formatOutgoing');

class WhatsAppProvider extends MetaGraphChannelProvider {
  static channelKey = 'whatsapp';

  parseIncomingWebhook(body) {
    return parseIncoming(body);
  }

  async sendMessage(outgoingMessage, channelConfig) {
    const payload = formatOutgoing(outgoingMessage);
    const data = await this.postToGraph(channelConfig.external_account_id, channelConfig.access_token, payload);
    return { externalMessageId: data.messages?.[0]?.id };
  }

  async markAsRead(externalMessageId, channelConfig) {
    await this.postToGraph(channelConfig.external_account_id, channelConfig.access_token, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: externalMessageId
    });
  }
}

module.exports = { WhatsAppProvider };
