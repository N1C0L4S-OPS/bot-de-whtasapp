const db = require('../config/db');

async function getUpcomingAppointments(hoursAhead = 24) {
  const now = new Date();
  const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const appointments = await db('appointments as a')
    .join('patients as p', 'a.patient_id', 'p.id')
    .leftJoin('users as u', 'a.dentist_id', 'u.id')
    .where('a.date', '>=', db.raw('CURRENT_DATE'))
    .where('a.status', 'confirmed')
    .where('a.payment_status', '!=', 'cancelled')
    .select(
      'a.id as appointment_id',
      'a.date',
      'a.time',
      'a.treatment',
      'a.patient_id',
      'p.first_name',
      'p.last_name',
      'p.phone',
      'u.name as dentist_name'
    )
    .orderBy('a.date', 'asc')
    .orderBy('a.time', 'asc');

  return appointments;
}

async function getAppointmentsInWindow(targetDate, startHour, endHour) {
  const appointments = await db('appointments as a')
    .join('patients as p', 'a.patient_id', 'p.id')
    .leftJoin('users as u', 'a.dentist_id', 'u.id')
    .where('a.date', targetDate)
    .where('a.status', 'confirmed')
    .where('a.payment_status', '!=', 'cancelled')
    .whereRaw("a.time::time >= ?::time AND a.time::time < ?::time", [startHour, endHour])
    .select(
      'a.id as appointment_id',
      'a.date',
      'a.time',
      'a.treatment',
      'a.patient_id',
      'p.first_name',
      'p.last_name',
      'p.phone',
      'u.name as dentist_name'
    )
    .orderBy('a.time', 'asc');

  return appointments;
}

async function findPatientByPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  const patient = await db('patients')
    .whereRaw("REPLACE(REPLACE(phone, ' ', ''), '-', '') LIKE ?", [`%${cleaned.slice(-9)}%`])
    .where('status', 'active')
    .first();
  return patient || null;
}

module.exports = { getUpcomingAppointments, getAppointmentsInWindow, findPatientByPhone };
