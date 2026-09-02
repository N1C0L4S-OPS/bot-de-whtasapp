const cron = require('node-cron');
const env = require('../config/env');
const { db } = require('../db/scope');
const { scheduleReminders } = require('../services/reminderSchedulingService');
const { withLock } = require('./locks');

async function getActiveTenantIds() {
  const rows = await db('tenants').where({ status: 'active' }).select('id');
  return rows.map((r) => r.id);
}

async function runForAllTenants(type, lockKey) {
  await withLock(lockKey, 300, async () => {
    const tenantIds = await getActiveTenantIds();
    for (const tenantId of tenantIds) {
      try {
        const result = await scheduleReminders(tenantId, type);
        if (result.scheduled > 0 || type === '24h') {
          console.log(`[CRON] Recordatorios ${type} tenant ${tenantId}: ${result.scheduled} encolados, ${result.skipped} saltados.`);
        }
      } catch (err) {
        console.error(`[CRON] Error en recordatorios ${type} para tenant ${tenantId}:`, err.message);
      }
    }
  });
}

function startScheduler() {
  const { hour, minute } = env.reminder24h;

  cron.schedule(`${minute} ${hour} * * *`, () => runForAllTenants('24h', 'cron:reminder-24h'));

  if (env.reminder3hEnabled) {
    cron.schedule('0 * * * *', () => runForAllTenants('3h', 'cron:reminder-3h'));
  }

  console.log('[CRON] Scheduler iniciado.');
  console.log(`  - Recordatorios 24h: diario a las ${hour}:${String(minute).padStart(2, '0')}`);
  console.log(`  - Recordatorios 3h: ${env.reminder3hEnabled ? 'activado (cada hora)' : 'desactivado'}`);
}

module.exports = { startScheduler };
