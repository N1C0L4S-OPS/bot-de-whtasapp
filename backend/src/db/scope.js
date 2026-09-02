const db = require('../config/db');

// Mismo patrón que el sistema principal (backend/src/db/scope.js de ese repo): tira error
// de inmediato si falta tenantId, en vez de dejar pasar en silencio una query sin filtrar
// por tenant. Es el único punto de entrada permitido para leer/escribir tablas propias del
// bot (channel_configs, contacts, conversations, messages, scheduled_sends).
function scoped(tableName, tenantId) {
  if (!tenantId) {
    throw new Error(`scoped('${tableName}') llamado sin tenantId.`);
  }
  return db(tableName).where(`${tableName}.tenant_id`, tenantId);
}

module.exports = { scoped, db };
