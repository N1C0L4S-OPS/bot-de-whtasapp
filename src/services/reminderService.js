const db = require('../config/db');
const { sendTextMessage } = require('./whatsappService');
const { formatPhone, formatDateES, formatTime12 } = require('../utils/helpers');

async function sendReminders(type = '24h') {
  const now = new Date();
  let targetDate;
  let hoursAhead;

  if (type === '24h') {
    targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 1);
    hoursAhead = 24;
  } else {
    targetDate = now;
    hoursAhead = 3;
  }

  const dateStr = targetDate.toISOString().split('T')[0];
  const appointments = await db('appointments as a')
    .join('patients as p', 'a.patient_id', 'p.id')
    .leftJoin('users as u', 'a.dentist_id', 'u.id')
    .where('a.date', dateStr)
    .where('a.status', 'confirmed')
    .select(
      'a.id as appointment_id',
      'a.time',
      'a.treatment',
      'p.first_name',
      'p.last_name',
      'p.phone',
      'u.name as dentist_name'
    )
    .orderBy('a.time', 'asc');

  const clinicName = process.env.CLINIC_NAME || 'Centro Odontológico MY DENT\'S';
  const results = [];

  for (const apt of appointments) {
    if (!apt.phone) continue;

    const phone = formatPhone(apt.phone);
    if (!phone) continue;

    const [h, m] = apt.time.split(':');
    const timeStr = formatTime12(h, m);
    const dateFormatted = formatDateES(targetDate);
    const patientName = `${apt.first_name} ${apt.last_name}`.trim();
    const dentist = apt.dentist_name || 'el doctor';

    let message;
    if (type === '24h') {
      message = `Hola ${patientName}, le recordamos que tiene una cita mañana:\n\n` +
        `Fecha: ${dateFormatted}\n` +
        `Hora: ${timeStr}\n` +
        `Tratamiento: ${apt.treatment || 'Consulta general'}\n` +
        `Doctor: ${dentist}\n\n` +
        `Centro: ${clinicName}\n\n` +
        `Si necesita reprogramar, contáctenos.`;
    } else {
      message = `Hola ${patientName}, le recordamos que su cita es en aproximadamente 3 horas:\n\n` +
        `Hora: ${timeStr}\n` +
        `Tratamiento: ${apt.treatment || 'Consulta general'}\n` +
        `Doctor: ${dentist}\n\n` +
        `Centro: ${clinicName}\n\n` +
        `Lo esperamos.`;
    }

    try {
      await sendTextMessage(phone, message);
      await db('bot_reminders').insert({
        appointment_id: apt.appointment_id,
        patient_id: apt.patient_id,
        patient_phone: phone,
        patient_name: patientName,
        reminder_type: type,
        appointment_datetime: new Date(`${dateStr}T${apt.time}`),
        status: 'sent',
        sent_at: new Date(),
      });
      results.push({ patient: patientName, status: 'sent' });
    } catch (err) {
      await db('bot_reminders').insert({
        appointment_id: apt.appointment_id,
        patient_id: apt.patient_id,
        patient_phone: phone,
        patient_name: patientName,
        reminder_type: type,
        appointment_datetime: new Date(`${dateStr}T${apt.time}`),
        status: 'failed',
        error_message: err.message,
      });
      results.push({ patient: patientName, status: 'failed', error: err.message });
    }
  }

  return results;
}

module.exports = { sendReminders };
