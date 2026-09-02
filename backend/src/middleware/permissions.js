// Copia exacta del patrón del sistema principal — mismas claves de permisos/módulos en el
// JWT ({permissions: [], modules: []}), misma forma de chequearlas. Las claves nuevas que
// usa el bot (messaging.view, messaging.reply, messaging.manage_config, módulo 'messaging')
// se siembran en la tabla `permissions`/`modules` desde una migración del sistema principal,
// no desde acá — ver backend/src/db/migrations/ del otro repo.

function requirePermission(...keys) {
  return function (req, res, next) {
    const userPerms = req.user?.permissions || [];
    const ok = keys.every(k => userPerms.includes(k));
    if (!ok) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción.' });
    }
    next();
  };
}

function requireModule(key) {
  return function (req, res, next) {
    const userModules = req.user?.modules || [];
    if (!userModules.includes(key)) {
      return res.status(403).json({ error: 'Este módulo no está habilitado para tu clínica.' });
    }
    next();
  };
}

module.exports = { requirePermission, requireModule };
