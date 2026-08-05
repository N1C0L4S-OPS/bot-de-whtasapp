require('dotenv').config();

const whatsappConfig = {
  token: process.env.WHATSAPP_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
  baseUrl: 'https://graph.facebook.com',
};

module.exports = whatsappConfig;
