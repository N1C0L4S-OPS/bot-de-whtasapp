/**
 * Forma normalizada de un mensaje entrante, sin importar de qué canal vino. Los workers y
 * services de negocio trabajan siempre contra esta forma, nunca contra el payload crudo de
 * Meta directamente — así una regla de auto-respuesta no le importa si el mensaje llegó por
 * WhatsApp, Messenger o Instagram.
 *
 * @typedef {Object} IncomingMessage
 * @property {string} channel - 'whatsapp' | 'messenger' | 'instagram'
 * @property {string} externalAccountId - phone_number_id / page_id / ig_user_id que recibió el mensaje
 * @property {string} externalContactId - wa_id / PSID / IGSID de quien escribe
 * @property {string} externalMessageId
 * @property {string} [contactDisplayName]
 * @property {string} text
 * @property {'text'|'interactive_reply'|'button'|'unsupported'} type
 * @property {string} [interactivePayload] - id normalizado de botón/lista, si aplica
 * @property {Date} timestamp
 * @property {Object} raw - payload original, para auditoría/debug
 */

/**
 * @typedef {Object} DeliveryStatus
 * @property {string} channel
 * @property {string} externalMessageId
 * @property {'sent'|'delivered'|'read'|'failed'} status
 * @property {string} [errorMessage]
 * @property {Date} timestamp
 */

/**
 * Forma normalizada de un mensaje saliente. sendMessage() de cada provider recibe esto y lo
 * traduce a la forma específica que espera esa API.
 *
 * @typedef {Object} OutgoingMessage
 * @property {string} channel
 * @property {string} externalContactId - a quién se le manda
 * @property {string} text
 * @property {'text'} type - por ahora solo texto; template/interactive se suman cuando haga falta
 */

module.exports = {};
