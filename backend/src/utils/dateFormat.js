// TODO: sin manejo de timezone real — usa la hora local del proceso. Mientras el servidor
// corra en la misma zona horaria que el consultorio (Perú, UTC-5) esto es correcto, pero es
// una bomba de tiempo silenciosa si el server alguna vez corre en otra TZ (ej. un droplet
// configurado en UTC por defecto). Cuando eso pase, migrar a una librería TZ-aware
// (date-fns-tz o luxon) en vez de Date local.
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function formatDateES(date) {
  const d = new Date(date);
  return `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime12(hours, minutes) {
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

// NUNCA usar date.toISOString().split('T')[0] para esto — toISOString() convierte a UTC
// antes de cortar la fecha, así que con Perú en UTC-5, cualquier hora local entre las 19:00
// y medianoche calcula "hoy" como si ya fuera el día siguiente (y "mañana" con el mismo
// corrimiento). Se detectó en vivo probando el scheduler: una cita para el 2 de septiembre
// calculaba "mañana" como el 3. Esto arma el string de fecha a partir de los componentes
// LOCALES del Date, sin pasar nunca por UTC.
function localDateString(date, offsetDays = 0) {
  const d = new Date(date);
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

module.exports = { formatDateES, formatTime12, localDateString };
