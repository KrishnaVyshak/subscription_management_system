import { query, withTransaction } from '../config/db.js';
import { todayIST } from '../lib/dates.js';
import { runBilling } from '../modules/billing/service.js';
import { applyTransition } from '../modules/subscriptions/service.js';

// Moves each selected subscription in its own transaction; re-checks the row under lock so
// running a job twice (or alongside the API) is harmless.
async function transitionEach(ids, { to, reason, note, stillValid }, today) {
  const result = { processed: 0, failed: 0, errors: [] };
  for (const id of ids) {
    try {
      const moved = await withTransaction(async (client) => {
        const { rows } = await client.query('select * from subscriptions where id = $1 for update', [id]);
        const sub = rows[0];
        if (!sub || !stillValid(sub)) return false;
        await applyTransition(client, sub, { to, reason, note, force: true }, { isAdmin: true, today });
        return true;
      });
      if (moved) result.processed += 1;
    } catch (err) {
      result.failed += 1;
      result.errors.push({ subscriptionId: id, message: err.message });
    }
  }
  return result;
}

// 1. Close quotations whose validity has passed.
export async function expireQuotations(today = todayIST()) {
  const { rows } = await query(
    `select id from subscriptions where status = 'quotation' and quote_valid_until < $1`,
    [today],
  );
  return transitionEach(
    rows.map((r) => r.id),
    {
      to: 'closed',
      reason: 'quote_expired',
      note: 'Quotation expired',
      stillValid: (s) => s.status === 'quotation' && s.quote_valid_until && s.quote_valid_until < today,
    },
    today,
  );
}

// 2. Activate confirmed subscriptions whose start date has arrived.
export async function activateConfirmed(today = todayIST()) {
  const { rows } = await query(
    `select id from subscriptions where status = 'confirmed' and start_date <= $1`,
    [today],
  );
  return transitionEach(
    rows.map((r) => r.id),
    {
      to: 'active',
      note: 'Start date reached',
      stillValid: (s) => s.status === 'confirmed' && s.start_date <= today,
    },
    today,
  );
}

// 3. Bill everything due today.
export async function billDue(today = todayIST(), triggeredBy = null) {
  try {
    const run = await runBilling({ asOfDate: today, triggeredBy, source: 'job' });
    return { processed: run.generated, skipped: run.skipped, failed: run.failed, runId: run.id, errors: run.errors };
  } catch (err) {
    if (err.status === 409) return { processed: 0, skipped: 1, failed: 0, errors: [{ message: err.message }] };
    throw err;
  }
}

// 4. Close subscriptions past their expiry date when the plan auto-closes.
export async function autoCloseExpired(today = todayIST()) {
  const { rows } = await query(
    `select s.id from subscriptions s join plans p on p.id = s.plan_id
      where s.status in ('active', 'paused') and s.expiry_date < $1 and p.auto_close`,
    [today],
  );
  return transitionEach(
    rows.map((r) => r.id),
    {
      to: 'closed',
      reason: 'expired',
      note: 'Expired',
      stillValid: (s) => ['active', 'paused'].includes(s.status) && s.expiry_date && s.expiry_date < today,
    },
    today,
  );
}

// 5. Switch off discounts that are past their end date or out of uses.
export async function deactivateDiscounts(today = todayIST()) {
  const { rowCount } = await query(
    `update discounts set is_active = false
      where is_active and ((end_date is not null and end_date < $1)
                           or (usage_limit is not null and usage_count >= usage_limit))`,
    [today],
  );
  return { processed: rowCount, failed: 0, errors: [] };
}

export const JOBS = {
  'expire-quotations': expireQuotations,
  'activate-subscriptions': activateConfirmed,
  'run-billing': billDue,
  'auto-close': autoCloseExpired,
  'deactivate-discounts': deactivateDiscounts,
};

// All five, in order. Each is idempotent; one failing does not stop the rest.
export async function runDailyJobs(today = todayIST(), triggeredBy = null) {
  const results = {};
  for (const [name, job] of Object.entries(JOBS)) {
    try {
      results[name] = await job(today, triggeredBy);
    } catch (err) {
      results[name] = { processed: 0, failed: 1, errors: [{ message: err.message }] };
    }
  }
  return { asOfDate: today, results };
}
