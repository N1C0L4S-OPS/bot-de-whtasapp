require('dotenv').config();
const app = require('./web/server');
const { startScheduler } = require('./scheduler/cron');
const db = require('./config/db');

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  console.log('Starting My Dent\'s Bot...');
  console.log(`Response mode: ${process.env.RESPONSE_MODE || 'known_patients'}`);

  try {
    await db.raw('SELECT 1');
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }

  startScheduler();

  app.listen(PORT, HOST, () => {
    console.log(`Bot server running on http://${HOST}:${PORT}`);
    console.log(`Webhook: http://${HOST}:${PORT}/webhook`);
    console.log(`GUI: http://localhost:${PORT}`);
  });
}

start();
