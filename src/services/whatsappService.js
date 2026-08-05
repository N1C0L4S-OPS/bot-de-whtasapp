const axios = require('axios');
const config = require('../config/whatsapp');

async function sendTextMessage(to, text) {
  const url = `${config.baseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`;
  const response = await axios.post(url, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  }, {
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}

async function markAsRead(messageId) {
  const url = `${config.baseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`;
  await axios.post(url, {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  }, {
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
  });
}

module.exports = { sendTextMessage, markAsRead };
