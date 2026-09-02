const env = require('../config/env');
const appointmentLookupService = require('./appointmentLookupService');

const CONFIRM_KEYWORDS = ['1', '1️⃣', 'confirmar', 'confirmo'];
const CANCEL_KEYWORDS = ['3', '3️⃣', 'cancelar', 'cancelo'];
const RESCHEDULE_KEYWORDS = ['2', '2️⃣', 'reprogramar', 'reprogramo'];

/**
 * Decide qué responder (si corresponde) a un mensaje entrante ya guardado. Aislado en su
 * propio módulo, no inline dentro del webhook/worker — así se puede probar y extender sin
 * tocar el pipeline de colas.
 *
 * @param {import('../channels/types').IncomingMessage} incomingMessage
 * @param {Object} contact - fila de contacts
 * @param {number} tenantId
 * @returns {Promise<string|null>} texto a responder, o null si no corresponde contestar
 */
async function handleInboundMessage(incomingMessage, contact, tenantId) {
  const normalized = (incomingMessage.text || '').trim().toLowerCase();

  if (CONFIRM_KEYWORDS.includes(normalized) || CANCEL_KEYWORDS.includes(normalized) || RESCHEDULE_KEYWORDS.includes(normalized)) {
    return handleAppointmentReply(normalized, contact, tenantId);
  }

  return handleGenericAutoReply(contact, tenantId);
}

async function handleAppointmentReply(normalized, contact, tenantId) {
  if (!contact.phone) return null;

  const found = await appointmentLookupService.findLatestUpcomingAppointmentByPhone(tenantId, contact.phone);
  if (!found) {
    return 'No encontramos ninguna cita próxima asociada a tu número. Si creés que es un error, comunicate con el consultorio.';
  }

  if (CONFIRM_KEYWORDS.includes(normalized)) {
    await appointmentLookupService.updateAppointmentStatusFromChannel(tenantId, found.appointment_id, 'confirmed');
    return `¡Gracias, ${found.patient.first_name}! Tu cita quedó confirmada.`;
  }

  if (CANCEL_KEYWORDS.includes(normalized)) {
    await appointmentLookupService.updateAppointmentStatusFromChannel(tenantId, found.appointment_id, 'canceled');
    return `Tu cita fue cancelada. Si querés reagendar, escribinos cuando quieras.`;
  }

  if (RESCHEDULE_KEYWORDS.includes(normalized)) {
    // Reprogramar de verdad (elegir nueva fecha/hora por chat) queda para una fase siguiente —
    // hoy, igual que el bot viejo, solo avisa que alguien del consultorio va a llamar.
    return 'Recibido — alguien del consultorio te va a llamar para coordinar un nuevo horario.';
  }

  return null;
}

async function handleGenericAutoReply(contact, tenantId) {
  if (env.responseMode === 'known_patients') {
    const patient = contact.phone ? await appointmentLookupService.findPatientByPhone(tenantId, contact.phone) : null;
    if (!patient) return null; // no responde a desconocidos
  }

  if (env.responseMode === 'keyword') {
    // El chequeo de la palabra clave lo hace el caller si hace falta filtrar antes de llegar
    // acá; en este punto ya decidimos que corresponde responder.
  }

  return `Hola${contact.display_name ? ' ' + contact.display_name : ''}, gracias por escribirnos a ${env.clinic.name}. En breve te va a responder alguien del consultorio.`;
}

module.exports = { handleInboundMessage };
