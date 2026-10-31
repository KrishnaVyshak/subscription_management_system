import { env } from './config/env.js';
import { createApp } from './app.js';
import { startScheduler } from './jobs/scheduler.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Daily jobs (00:05 IST): expire quotes, activate, bill, auto-close, deactivate discounts.
if (env.JOBS_ENABLED && env.NODE_ENV !== 'test') {
  startScheduler();
  console.log('Daily jobs scheduled for 00:05 Asia/Kolkata');
}
