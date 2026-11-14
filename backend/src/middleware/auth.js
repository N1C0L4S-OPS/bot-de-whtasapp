const crypto = require('crypto');
const env = require('../config/env');

// El bot NO tiene login propio NI comparte el secreto del sistema principal.
// El personal inicia sesión en el sistema principal y trae ese token; para validarlo, el
// bot le pregunta al sistema principal quién es (GET /api/auth/profile). Ventajas:
// - Si el bot se ve comprometido, no hay ningún secreto acá con el cual fabricar sesiones.
// - Permisos, usuario desactivado o consultorio suspendido se respetan al instante, porque
//   el sistema principal los lee de la base en cada consulta.
// - Si el login del sistema principal cambia de tecnología, este contrato sigue igual.
//
// Caché corta (15 s) por token para no consultar en cada petición de una misma pantalla.
const CACHE_MS = 15 * 1000;
const cache = new Map();

function cacheKey(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function fetchSession(token) {
  const key = cacheKey(token);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  const res = await fetch(`${env.mainApiUrl}/api/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  });
  let value;
  if (res.ok) {
    const profile = await res.json();
    value = {
      ok: true,
      user: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        tenant_id: profile.tenant?.id,
        permissions: profile.permissions || [],
        modules: profile.modules || [],
        must_change_password: !!profile.must_change_password,
      },
    };
  } else {
    let body = {};
    try { body = await res.json(); } catch { /* sin cuerpo */ }
    value = { ok: false, status: res.status === 401 ? 401 : 403, error: body.error || 'Token inválido o expirado.' };
  }
  cache.set(key, { value, expires: Date.now() + CACHE_MS });
  if (cache.size > 5000) cache.clear(); // tope simple de memoria
  return value;
}

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticación requerido.' });
  }

  try {
    const session = await fetchSession(token);
    if (!session.ok) {
      return res.status(session.status).json({ error: session.error });
    }
    if (!session.user.tenant_id) {
      return res.status(403).json({ error: 'Usuario sin consultorio asignado.' });
    }
    if (session.user.must_change_password) {
      return res.status(403).json({ error: 'Debe cambiar su contraseña en el sistema principal antes de continuar.', code: 'PASSWORD_CHANGE_REQUIRED' });
    }
    req.user = session.user;
    next();
  } catch (err) {
    console.error('No se pudo validar la sesión contra el sistema principal:', err.message);
    return res.status(503).json({ error: 'No se pudo verificar la sesión. Intente de nuevo en unos segundos.' });
  }
}

module.exports = { authenticateToken };
