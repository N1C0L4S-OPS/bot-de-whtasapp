const { WhatsAppProvider } = require('./whatsapp/WhatsAppProvider');
const { MessengerProvider } = require('./messenger/MessengerProvider');
const { InstagramProvider } = require('./instagram/InstagramProvider');

const providers = {
  whatsapp: new WhatsAppProvider(),
  messenger: new MessengerProvider(),
  instagram: new InstagramProvider()
};

/**
 * @param {string} channelKey
 * @returns {import('./ChannelProvider').ChannelProvider}
 */
function getProvider(channelKey) {
  const provider = providers[channelKey];
  if (!provider) {
    throw new Error(`Canal desconocido: '${channelKey}'.`);
  }
  return provider;
}

module.exports = { getProvider, CHANNEL_KEYS: Object.keys(providers) };
