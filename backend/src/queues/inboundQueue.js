const { Queue } = require('bullmq');
const redisConfig = require('../config/redis');

const inboundQueue = new Queue('inbound-processing', {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 200,
    removeOnFail: 500
  }
});

module.exports = { inboundQueue };
