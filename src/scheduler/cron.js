const cron = require('node-cron');
const { sendReminders } = require('../services/reminderService');

function startScheduler() {
  const hour24 = process.env.REMINDER_24H_HOUR || 8;
  const minute24 = process.env.REMINDER_24H_MINUTE || 0;

  cron.schedule(`${minute24} ${hour24} * * *`, async () => {
    console.log(`[CRON] Sending 24h reminders at ${new Date().toISOString()}`);
    try {
      const results = await sendReminders('24h');
      console.log(`[CRON] 24h reminders: ${results.length} processed`);
    } catch (err) {
      console.error('[CRON] 24h reminder error:', err.message);
    }
  });

  if (process.env.REMINDER_3H_ENABLED === 'true') {
    cron.schedule('0 * * * *', async () => {
      console.log(`[CRON] Checking 3h reminders at ${new Date().toISOString()}`);
      try {
        const results = await sendReminders('3h');
        if (results.length > 0) {
          console.log(`[CRON] 3h reminders: ${results.length} processed`);
        }
      } catch (err) {
        console.error('[CRON] 3h reminder error:', err.message);
      }
    });
  }

  console.log('[CRON] Scheduler started');
  console.log(`  - 24h reminders: daily at ${hour24}:${String(minute24).padStart(2, '0')}`);
  console.log(`  - 3h reminders: ${process.env.REMINDER_3H_ENABLED === 'true' ? 'enabled (hourly)' : 'disabled'}`);
}

module.exports = { startScheduler };
