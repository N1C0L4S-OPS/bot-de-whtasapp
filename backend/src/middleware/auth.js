const jwt = require('jsonwebtoken');
const env = require('../config/env');

// El bot NO tiene su propio login: el personal ya inició sesión en el sistema principal y
// trae ese mismo token acá. Por eso solo hay authenticateToken (verificar), no generateToken
// (emitir) — emitir tokens sigue siendo responsabilidad exclusiva del sistema principal.
// JWT_SECRET tiene que ser BYTE A BYTE el mismo valor que ese repo, si no todo token válido
// ahí se rechaza acá.

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticación requerido.' });
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
}

module.exports = { authenticateToken };
