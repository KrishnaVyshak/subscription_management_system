import cron from 'node-cron';
import { APP_TIMEZONE } from '@brightloop/shared';
import { runDailyJobs } from './daily.js';

// Daily at 00:05 IST.
export function startScheduler() {
  return cron.schedule(
    '5 0 * * *',
    async () => {
      try {
        const { asOfDate, results } = await runDailyJobs();
        console.log(`[jobs] daily run for ${asOfDate}:`, JSON.stringify(results));
      } catch (err) {
        console.error('[jobs] daily run failed:', err);
      }
    },
    { timezone: APP_TIMEZONE, name: 'daily-jobs' },
  );
}
