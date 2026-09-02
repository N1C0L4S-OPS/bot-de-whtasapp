// Red de seguridad final, mismo patrón agregado hoy al sistema principal (server.js): un
// error que llegue hasta acá (via next(err) o una excepción sin capturar en un route handler)
// devuelve un 500 prolijo en vez de tumbar el proceso o filtrar detalles internos. Tiene que
// montarse DESPUÉS de todas las rutas.
function errorHandler(err, req, res, next) {
  console.error('Error no manejado:', err);
  if (res.headersSent) return next(err);

  const status = (err.status || err.statusCode) && err.status < 500 ? (err.status || err.statusCode) : 500;
  const message = status === 400 && err.type === 'entity.parse.failed'
    ? 'JSON inválido en el cuerpo de la petición.'
    : 'Error interno del servidor.';

  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
