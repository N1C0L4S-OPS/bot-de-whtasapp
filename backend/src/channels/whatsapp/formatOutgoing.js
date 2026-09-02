/**
 * Traduce un OutgoingMessage normalizado a la forma exacta que espera el endpoint
 * /messages de WhatsApp Cloud API.
 * @param {import('../types').OutgoingMessage} outgoingMessage
 */
function formatOutgoing(outgoingMessage) {
  return {
    messaging_product: 'whatsapp',
    to: outgoingMessage.externalContactId,
    type: 'text',
    text: { body: outgoingMessage.text }
  };
}

module.exports = { formatOutgoing };
