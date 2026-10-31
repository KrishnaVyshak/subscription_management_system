import { env } from '../../config/env.js';
import { query, withTransaction } from '../../config/db.js';
import { calculateInvoice } from '../../domain/invoiceCalc.js';
import { isLineActiveOn } from '../../domain/mrr.js';
import { period, periodStart } from '../../domain/periods.js';
import { addDays, todayIST } from '../../lib/dates.js';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../lib/errors.js';
import { fmt } from '../../lib/money.js';
import * as discounts from '../discounts/engine.js';
import { getSetting } from '../settings/routes.js';
import { linesFor } from '../subscriptions/repo.js';
import { withTotal } from '../../lib/http.js';

const BATCH_SIZE = 5;

// Due: active, next_invoice_date ≤ asOfDate, and not past expiry.
export function isDue(sub, asOfDate) {
  return (
    sub.status === 'active' &&
    Boolean(sub.next_invoice_date) &&
    sub.next_invoice_date <= asOfDate &&
    (!sub.expiry_date || sub.next_invoice_date <= sub.expiry_date)
  );
}

// Sequential on purpose: a transaction client runs one query at a time.
async function loadContext(client, sub) {
  const autoConfirm = await getSetting('invoice.auto_confirm', client);
  const company = await getSetting('company', client);
  const customer = await client.query(
    'select name, email, phone, billing_address, gstin from customers where id = $1',
    [sub.customer_id],
  );
  const term = sub.payment_term_id
    ? await client.query('select due_days from payment_terms where id = $1', [sub.payment_term_id])
    : { rows: [] };
  const lines = await linesFor(client, sub.id);
  return {
    autoConfirm: autoConfirm !== false,
    company: company ?? {},
    customer: customer.rows[0],
    dueDays: term.rows[0]?.due_days ?? 0,
    lines,
  };
}

// Builds the invoice for one period inside the subscription's transaction.
// Returns the new invoice id, or null when that period already has a live invoice.
async function billPeriod(client, sub, ctx, { start, end, runId, userId }) {
  const lines = ctx.lines.filter((l) => isLineActiveOn(l, start));
  const picked = await discounts.claimDiscounts(client, { sub, lines, invoiceDate: start });
  const calc = calculateInvoice(
    lines.map((l) => ({ ...l, lineDiscount: picked.lineDiscounts.get(l.id) ?? null })),
    picked.invoiceDiscount,
  );

  // A zero invoice (e.g. fully discounted) has nothing to collect.
  let status = ctx.autoConfirm ? 'confirmed' : 'draft';
  if (status === 'confirmed' && calc.total.isZero()) status = 'paid';

  const { rows } = await client.query(
    `insert into invoices
       (number, subscription_id, customer_id, status, period_start, period_end, invoice_date, due_date,
        subtotal, discount_total, tax_total, total, customer_snapshot, company_snapshot,
        billing_run_id, created_by, confirmed_at, paid_at)
     values (next_doc_number('INV', $4::date), $1, $2, $3::invoice_status, $4::date, $5, $4::date, $6,
             $7, $8, $9, $10, $11, $12, $13, $14,
             case when $3::invoice_status in ('confirmed', 'paid') then now() end,
             case when $3::invoice_status = 'paid' then now() end)
     on conflict (subscription_id, period_start) where status <> 'cancelled' do nothing
     returning id`,
    [
      sub.id,
      sub.customer_id,
      status,
      start,
      end,
      addDays(start, ctx.dueDays),
      fmt(calc.subtotal),
      fmt(calc.discount_total),
      fmt(calc.tax_total),
      fmt(calc.total),
      JSON.stringify(ctx.customer),
      JSON.stringify(ctx.company),
      runId,
      userId,
    ],
  );
  const invoiceId = rows[0]?.id;
  if (!invoiceId) {
    await discounts.releaseClaims(client, picked.claimedIds);
    return null;
  }

  for (const [i, line] of calc.lines.entries()) {
    const { rows: inserted } = await client.query(
      `insert into invoice_lines
         (invoice_id, subscription_line_id, product_id, description, quantity, unit_price,
          line_subtotal, discount_amount, taxable_amount, tax_amount, amount, sort_order)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id`,
      [
        invoiceId,
        line.id,
        line.product_id,
        line.description,
        line.quantity,
        line.unit_price,
        fmt(line.line_subtotal),
        fmt(line.discount_amount),
        fmt(line.taxable_amount),
        fmt(line.tax_amount),
        fmt(line.amount),
        i,
      ],
    );
    for (const t of line.tax_lines) {
      await client.query(
        `insert into invoice_line_taxes
           (invoice_line_id, tax_id, tax_name, type, rate, price_included, amount)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [inserted[0].id, t.id, t.name, t.type, t.rate, t.price_included, fmt(t.amount)],
      );
    }
  }
  await discounts.recordUsages(client, { invoiceId, sub, picked, calc });
  return invoiceId;
}

/**
 * Bills every due period of one subscription (catch-up), in its own transaction.
 * A row locked by another biller is skipped; the partial unique index makes a duplicate
 * period impossible even if two billers race.
 */
export async function billSubscription(subscriptionId, asOfDate, { runId = null, userId = null, maxPeriods = Infinity } = {}) {
  return withTransaction(async (client) => {
    const result = { generated: 0, skipped: 0, invoiceIds: [], locked: false };
    const { rows } = await client.query(
      'select * from subscriptions where id = $1 for update skip locked',
      [subscriptionId],
    );
    const sub = rows[0];
    if (!sub) {
      result.skipped = 1;
      result.locked = true;
      return result;
    }
    if (!isDue(sub, asOfDate)) return result;

    const ctx = await loadContext(client, sub);
    const state = { ...sub };
    let count = 0;
    while (isDue(state, asOfDate) && count < maxPeriods) {
      const n = state.periods_billed;
      const { start, end } = period(sub.billing_anchor_date, sub.billing_period, sub.interval_count, n);
      const invoiceId = await billPeriod(client, sub, ctx, { start, end, runId, userId });
      if (invoiceId) {
        result.generated += 1;
        result.invoiceIds.push(invoiceId);
      } else {
        result.skipped += 1;
      }
      state.periods_billed = n + 1;
      state.next_invoice_date = periodStart(sub.billing_anchor_date, sub.billing_period, sub.interval_count, n + 1);
      count += 1;
    }
    await client.query(
      'update subscriptions set periods_billed = $2, next_invoice_date = $3 where id = $1',
      [sub.id, state.periods_billed, state.next_invoice_date],
    );
    return result;
  });
}

export function assertRunDate(asOfDate, today = todayIST()) {
  if (asOfDate > today && !env.DEMO_MODE) {
    throw new BusinessRuleError('Billing for a future date needs DEMO_MODE', {
      rule: 'FUTURE_DATE_NOT_ALLOWED',
    });
  }
}

/**
 * Bills every due subscription, BATCH_SIZE at a time, each in its own transaction. Errors are
 * collected per subscription without stopping the run. Only one run can be running (409).
 */
export async function runBilling({ asOfDate = todayIST(), triggeredBy = null, source = 'manual' } = {}) {
  // A run that crashed mid-way would block forever; give up on runs older than an hour.
  await query(
    `update billing_runs set status = 'failed', finished_at = now(),
            errors = errors || '[{"message":"Marked failed: no progress for an hour"}]'::jsonb
      where status = 'running' and started_at < now() - interval '1 hour'`,
  );
  let run;
  try {
    ({ rows: [run] } = await query(
      `insert into billing_runs (as_of_date, triggered_by, source) values ($1, $2, $3) returning *`,
      [asOfDate, triggeredBy, source],
    ));
  } catch (err) {
    if (err.code === '23505') throw new ConflictError('A billing run is already in progress');
    throw err;
  }

  const counts = { due: 0, generated: 0, skipped: 0, failed: 0 };
  const errors = [];
  let status = 'completed';
  try {
    const { rows: due } = await query(
      `select id from subscriptions
        where status = 'active' and next_invoice_date <= $1
          and (expiry_date is null or next_invoice_date <= expiry_date)
        order by next_invoice_date, id`,
      [asOfDate],
    );
    counts.due = due.length;
    for (let i = 0; i < due.length; i += BATCH_SIZE) {
      const batch = due.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((s) => billSubscription(s.id, asOfDate, { runId: run.id, userId: triggeredBy })),
      );
      results.forEach((r, j) => {
        if (r.status === 'fulfilled') {
          counts.generated += r.value.generated;
          counts.skipped += r.value.skipped;
        } else {
          counts.failed += 1;
          errors.push({ subscriptionId: batch[j].id, message: r.reason?.message ?? String(r.reason) });
        }
      });
    }
  } catch (err) {
    status = 'failed';
    errors.push({ message: err.message });
  }

  const { rows } = await query(
    `update billing_runs
        set status = $2, finished_at = now(), due = $3, generated = $4, skipped = $5, failed = $6,
            errors = $7::jsonb
      where id = $1 returning *`,
    [run.id, status, counts.due, counts.generated, counts.skipped, counts.failed, JSON.stringify(errors)],
  );
  return rows[0];
}

// POST /subscriptions/:id/invoices — bills the next period now, whatever its date.
export async function invoiceNextPeriod(subscriptionId, userId) {
  const { rows } = await query('select * from subscriptions where id = $1', [subscriptionId]);
  const sub = rows[0];
  if (!sub) throw new NotFoundError('Subscription not found');
  if (sub.status !== 'active') {
    throw new BusinessRuleError('Only active subscriptions can be invoiced', { rule: 'NOT_ACTIVE' });
  }
  if (sub.expiry_date && sub.next_invoice_date > sub.expiry_date) {
    throw new BusinessRuleError('The next period starts after the expiry date', { rule: 'PAST_EXPIRY' });
  }
  const result = await billSubscription(subscriptionId, sub.next_invoice_date, { userId, maxPeriods: 1 });
  if (result.locked) throw new ConflictError('This subscription is being billed right now');
  if (!result.generated) throw new ConflictError('The next period is already invoiced');
  return result.invoiceIds[0];
}

export async function listRuns({ page, pageSize }) {
  const { rows } = await query(
    `select r.*, p.full_name as triggered_by_name, count(*) over() as total
       from billing_runs r left join profiles p on p.id = r.triggered_by
      order by r.started_at desc limit $1 offset $2`,
    [pageSize, (page - 1) * pageSize],
  );
  return withTotal(rows);
}

export async function getRun(id) {
  const { rows } = await query(
    `select r.*, p.full_name as triggered_by_name,
            (select count(*) from invoices i where i.billing_run_id = r.id) as invoice_count
       from billing_runs r left join profiles p on p.id = r.triggered_by where r.id = $1`,
    [id],
  );
  if (!rows[0]) throw new NotFoundError('Billing run not found');
  return rows[0];
}
