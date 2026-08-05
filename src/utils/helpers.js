function formatPhone(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 9) cleaned = '51' + cleaned;
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  return cleaned;
}

function formatDateES(date) {
  const d = new Date(date);
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime12(hours, minutes) {
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

function isKnownPatientMode() {
  return process.env.RESPONSE_MODE === 'known_patients';
}

function isKeywordMode() {
  return process.env.RESPONSE_MODE === 'keyword';
}

function getKeyword() {
  return (process.env.KEYWORD_TRIGGER || 'PACIENTE').toUpperCase();
}

module.exports = {
  formatPhone,
  formatDateES,
  formatTime12,
  isKnownPatientMode,
  isKeywordMode,
  getKeyword,
};
