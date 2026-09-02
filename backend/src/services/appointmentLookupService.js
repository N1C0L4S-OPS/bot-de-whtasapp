const { db } = require('../db/scope');

// Reescrito contra el esquema REAL del sistema principal — el bot viejo usaba a.date, a.time,
// a.treatment y un join a `users` para el odontólogo, ninguno de los cuales existe así:
// las columnas correctas son appointment_date, time_slot, treatment_type, y el odontólogo
// sale de la tabla `dentists` (no `users`) vía `dentist_id`. Ese desalineamiento era el bug
// crítico que tumbaba cualquier intento de mandar un recordatorio real.
//
// Todas las queries van scoped por tenant_id — al compartir la base física con otros
// tenants, sin esto un recordatorio podría cruzarse entre consultorios.

function baseSelect() {
  return [
    'a.id as appointment_id',
    'a.appointment_date',
    'a.time_slot',
    'a.treatment_type',
    'a.patient_id',
    'p.first_name',
    'p.last_name',
    'p.phone',
    'd.first_name as dentist_first_name',
    'd.last_name as dentist_last_name'
  ];
}

async function getUpcomingAppointments(tenantId, hoursAhead = 24) {
  return db('appointments as a')
    .where('a.tenant_id', tenantId)
    .join('patients as p', 'a.patient_id', 'p.id')
    .leftJoin('dentists as d', 'a.dentist_id', 'd.id')
    .where('a.appointment_date', '>=', db.raw('CURRENT_DATE'))
    .whereIn('a.status', ['pending', 'confirmed'])
    .select(baseSelect())
    .orderBy('a.appointment_date', 'asc')
    .orderBy('a.time_slot', 'asc');
}

async function getAppointmentsInWindow(tenantId, targetDate, startHour, endHour) {
  return db('appointments as a')
    .where('a.tenant_id', tenantId)
    .join('patients as p', 'a.patient_id', 'p.id')
    .leftJoin('dentists as d', 'a.dentist_id', 'd.id')
    .where('a.appointment_date', targetDate)
    .whereIn('a.status', ['pending', 'confirmed'])
    .whereRaw("a.time_slot::time >= ?::time AND a.time_slot::time < ?::time", [startHour, endHour])
    .select(baseSelect())
    .orderBy('a.time_slot', 'asc');
}

async function findPatientByPhone(tenantId, phone) {
  const cleaned = phone.replace(/\D/g, '');
  const patient = await db('patients')
    .where('tenant_id', tenantId)
    .whereRaw("REPLACE(REPLACE(phone, ' ', ''), '-', '') LIKE ?", [`%${cleaned.slice(-9)}%`])
    .where('status', 'active')
    .first();
  return patient || null;
}

async function findLatestUpcomingAppointmentByPhone(tenantId, phone) {
  const patient = await findPatientByPhone(tenantId, phone);
  if (!patient) return null;

  const appointment = await db('appointments')
    .where({ tenant_id: tenantId, patient_id: patient.id })
    .whereIn('status', ['pending', 'confirmed'])
    .where('appointment_date', '>=', db.raw('CURRENT_DATE'))
    .orderBy('appointment_date', 'asc')
    .orderBy('time_slot', 'asc')
    .first();

  return appointment ? { ...appointment, patient } : null;
}

/**
 * Cambia el estado de una cita. Alcance intencionalmente angosto (solo status/confirmation_status,
 * solo desde 'pending'/'confirmed'), sin pasar por agendaService del sistema principal — eso
 * requeriría autenticación de servicio a servicio entre los dos repos, que hoy no existe (el
 * único mecanismo de auth es JWT de usuario logueado). Queda anotado como mejora futura: si se
 * arma un mecanismo de cuenta de servicio en el sistema principal, esto debería llamar a su API
 * real en vez de escribir la tabla directo, para heredar validaciones y auditoría centralizadas.
 */
async function updateAppointmentStatusFromChannel(tenantId, appointmentId, newStatus) {
  const allowedTransitions = { confirmed: ['pending'], canceled: ['pending', 'confirmed'] };
  const fromStatuses = allowedTransitions[newStatus];
  if (!fromStatuses) throw new Error(`Transición de estado no permitida: '${newStatus}'.`);

  const [updated] = await db('appointments')
    .where({ tenant_id: tenantId, id: appointmentId })
    .whereIn('status', fromStatuses)
    .update({ status: newStatus, updated_at: db.fn.now() })
    .returning('*');

  return updated || null;
}

module.exports = {
  getUpcomingAppointments,
  getAppointmentsInWindow,
  findPatientByPhone,
  findLatestUpcomingAppointmentByPhone,
  updateAppointmentStatusFromChannel
};
