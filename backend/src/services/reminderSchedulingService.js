const { db } = require('../db/scope');
const env = require('../config/env');
const appointmentLookupService = require('./appointmentLookupService');
const conversationService = require('./conversationService');
const { getOutboundQueue } = require('../queues/outboundQueue');
const { formatPhone } = require('../utils/phone');
const { formatDateES, formatTime12, localDateString } = require('../utils/dateFormat');

/**
 * Reescritura de reminderService.sendReminders() del bot viejo, con dos diferencias clave:
 *  1. Un solo camino de escritura — antes, si BullMQ fallaba, había un fallback que mandaba
 *     el mensaje directo Y duplicaba a mano el insert de bot_reminders, con el riesgo de que
 *     esa segunda copia de la lógica de guardado se desincronizara de la primera. Acá SIEMPRE
 *     se pasa por la cola; si Redis está caído, el job simplemente no se encola y el intento
 *     de idempotencia (unique(appointment_id, send_type)) sigue siendo válido para la próxima
 *     corrida del cron.
 *  2. Nombres de columna correctos (appointment_date/time_slot/treatment_type), que era el
 *     bug que rompía cualquier intento real de mandar un recordatorio.
 *
 * @param {number} tenantId
 * @param {'24h'|'3h'} type
 */
async function scheduleReminders(tenantId, type) {
  const now = new Date();
  const dateStr = type === '24h' ? localDateString(now, 1) : localDateString(now, 0);
  const targetDate = new Date(`${dateStr}T00:00:00`);

  const [startHour, endHour] = type === '24h' ? ['00:00', '23:59'] : formatHourWindow(now);
  const appointments = await appointmentLookupService.getAppointmentsInWindow(tenantId, dateStr, startHour, endHour);

  const channelConfig = await db('channel_configs')
    .where({ tenant_id: tenantId, channel: 'whatsapp', status: 'active' })
    .first();
  if (!channelConfig) {
    console.warn(`No hay channel_config de WhatsApp activo para el tenant ${tenantId} — no se pueden encolar recordatorios.`);
    return { scheduled: 0, skipped: appointments.length };
  }

  let scheduled = 0;
  let skipped = 0;

  for (const apt of appointments) {
    if (!apt.phone) { skipped++; continue; }
    const phone = formatPhone(apt.phone);
    if (!phone) { skipped++; continue; }

    // Idempotencia: si ya existe un scheduled_send 'sent' para esta cita+tipo, no se reenvía.
    const existing = await db('scheduled_sends')
      .where({ appointment_id: apt.appointment_id, send_type: `reminder_${type}` })
      .first();
    if (existing && existing.status === 'sent') { skipped++; continue; }

    const contact = await conversationService.upsertContact({
      tenantId, channel: 'whatsapp', externalContactId: phone,
      displayName: `${apt.first_name} ${apt.last_name}`.trim(), phone
    });
    const conversation = await conversationService.upsertConversation({
      tenantId, channelConfigId: channelConfig.id, contactId: contact.id
    });

    const text = buildReminderText(type, apt, targetDate);

    const [scheduledSend] = await db('scheduled_sends')
      .insert({
        tenant_id: tenantId,
        appointment_id: apt.appointment_id,
        patient_id: apt.patient_id,
        contact_id: contact.id,
        send_type: `reminder_${type}`,
        channel_preference: 'whatsapp',
        scheduled_for: db.fn.now(),
        status: 'queued'
      })
      .onConflict(['appointment_id', 'send_type'])
      .merge({ status: 'queued', contact_id: contact.id })
      .returning('*');

    await getOutboundQueue('whatsapp').add('send-message', {
      channel: 'whatsapp',
      channelConfigId: channelConfig.id,
      conversationId: conversation.id,
      tenantId,
      externalContactId: phone,
      text,
      scheduledSendId: scheduledSend.id
    });

    scheduled++;
  }

  return { scheduled, skipped };
}

function formatHourWindow(now) {
  const start = `${String(now.getHours()).padStart(2, '0')}:00`;
  const endHour = (now.getHours() + 3) % 24;
  const end = `${String(endHour).padStart(2, '0')}:00`;
  return [start, end];
}

function buildReminderText(type, apt, targetDate) {
  const [h, m] = apt.time_slot.split(':');
  const timeStr = formatTime12(h, m);
  const patientName = `${apt.first_name} ${apt.last_name}`.trim();
  const dentist = apt.dentist_first_name ? `${apt.dentist_first_name} ${apt.dentist_last_name}` : 'el doctor';
  const treatment = apt.treatment_type || 'Consulta general';

  if (type === '24h') {
    const dateFormatted = formatDateES(targetDate);
    return `Hola ${patientName}, le recordamos que tiene una cita mañana:\n\n` +
      `Fecha: ${dateFormatted}\n` +
      `Hora: ${timeStr}\n` +
      `Tratamiento: ${treatment}\n` +
      `Doctor: ${dentist}\n\n` +
      `Centro: ${env.clinic.name}\n\n` +
      `Responda 1 para confirmar, 2 para reprogramar o 3 para cancelar.`;
  }

  return `Hola ${patientName}, le recordamos que su cita es en aproximadamente 3 horas:\n\n` +
    `Hora: ${timeStr}\n` +
    `Tratamiento: ${treatment}\n` +
    `Doctor: ${dentist}\n\n` +
    `Centro: ${env.clinic.name}\n\n` +
    `Lo esperamos.`;
}

module.exports = { scheduleReminders };
