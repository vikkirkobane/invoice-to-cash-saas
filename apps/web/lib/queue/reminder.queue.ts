import { Queue, QueueScheduler, Worker } from 'bullmq';
import IRedis from 'ioredis';

const connection = new IRedis({
  host: process.env.REDIS_URL,
});

export const reminderQueue = new Queue('reminders', { connection });
export const queueScheduler = new QueueScheduler('reminders', { connection });

// Worker would run separately in production; here we define job processor
new Worker('reminders', async job => {
  // job.data contains invoiceId, templateId, etc.
  // Call EmailService.send() with rendered template
}, { connection });