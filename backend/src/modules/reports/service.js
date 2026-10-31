import { query } from '../../config/db.js';
import { todayIST } from '../../lib/dates.js';
import { Where } from '../../lib/http.js';

// Monthly factor per subscription row `s` (yearly 1/12, weekly 52/12, daily 365/12, ÷ interval).
const FACTOR = `(case s.billing_period
    when 'monthly' then 1::numeric
    when 'yearly' then 1::numeric / 12
    when 'weekly' then 52::numeric / 12
    when 'daily' then 365::numeric / 12 end / s.interval_count)`;

// Unrounded MRR per active subscription from its lines in effect on `today`.
const mrrCte = (w, todayP) => `
  sub_mrr as (
    select s.id, s.plan_id, s.customer_id,
           coalesce(sum(l.quantity * l.unit_price), 0) * ${FACTOR} as mrr
      from subscriptions s
      left join subscription_lines l on l.subscription_id = s.id
           and (l.starts_on is null or l.starts_on <= ${todayP})
           and (l.ends_on is null or l.ends_on >= ${todayP})
     where s.status = 'active' ${w.parts.length ? `and ${w.parts.join(' and ')}` : ''}
     group by s.id
  )`;

// Plan/customer filters on alias `s` (subscriptions) — shared by every query.
function scope(f, params = []) {
  const w = new Where(params);
  if (f.planId) w.add('s.plan_id = $?', f.planId);
  if (f.customerId) w.add('s.customer_id = $?', f.customerId);
  return w;
}

export function defaultRange(f, today = todayIST()) {
  return { from: f.from ?? `${today.slice(0, 7)}-01`, to: f.to ?? today };
}

/**
 * Stock figures (active, paused, MRR, ARR, outstanding, overdue) are as of today; flow figures
 * (invoiced, collected, new, churned) cover from..to. All aggregated in one statement.
 */
export async function summary(f, today = todayIST()) {
  const { from, to } = defaultRange(f, today);
  const w = scope(f);
  const todayP = w.param(today);
  const fromP = w.param(from);
  const toP = w.param(to);
  const and = w.parts.length ? `and ${w.parts.join(' and ')}` : '';
  const { rows } = await query(
    `with ${mrrCte(w, todayP)}
     select
       (select count(*) from subscriptions s where s.status = 'active' ${and}) as active_subscriptions,
       (select count(*) from subscriptions s where s.status = 'paused' ${and}) as paused_subscriptions,
       (select round(coalesce(sum(mrr), 0), 2)::text from sub_mrr) as mrr,
       (select round(coalesce(sum(mrr), 0) * 12, 2)::text from sub_mrr) as arr,
       (select coalesce(sum(i.total), 0)::text from invoices i join subscriptions s on s.id = i.subscription_id
         where i.status in ('confirmed', 'paid') and i.invoice_date between ${fromP} and ${toP} ${and}) as invoiced,
       (select coalesce(sum(p.amount), 0)::text from payments p
          join invoices i on i.id = p.invoice_id join subscriptions s on s.id = i.subscription_id
         where p.payment_date between ${fromP} and ${toP} ${and}) as collected,
       (select coalesce(sum(i.amount_due), 0)::text from invoice_overview i
          join subscriptions s on s.id = i.subscription_id
         where i.status = 'confirmed' ${and}) as outstanding,
       (select coalesce(sum(i.amount_due), 0)::text from invoice_overview i
          join subscriptions s on s.id = i.subscription_id where i.is_overdue ${and}) as overdue,
       (select count(*) from invoice_overview i
          join subscriptions s on s.id = i.subscription_id where i.is_overdue ${and}) as overdue_invoices,
       (select count(*) from subscriptions s
         where s.billing_anchor_date is not null and s.start_date between ${fromP} and ${toP} ${and}) as new_subscriptions,
       (select count(*) from subscriptions s
         where s.status = 'closed' and s.billing_anchor_date is not null
           and s.closed_at between ${fromP} and ${toP} ${and}) as churned_subscriptions`,
    w.params,
  );
  return { from, to, ...rows[0] };
}

// Last `months` calendar months (including empty ones) of invoiced and collected amounts.
export async function revenueTrend(f, today = todayIST()) {
  const months = f.months ?? 12;
  const w = scope(f);
  const todayP = w.param(today);
  const monthsP = w.param(months);
  const and = w.parts.length ? `and ${w.parts.join(' and ')}` : '';
  const { rows } = await query(
    `with m as (
       select generate_series(
                date_trunc('month', ${todayP}::date) - make_interval(months => ${monthsP}::int - 1),
                date_trunc('month', ${todayP}::date),
                interval '1 month')::date as month
     ),
     inv as (
       select date_trunc('month', i.invoice_date)::date as month, sum(i.total) as invoiced, count(*) as invoices
         from invoices i join subscriptions s on s.id = i.subscription_id
        where i.status in ('confirmed', 'paid')
          and i.invoice_date >= (select min(month) from m) ${and}
        group by 1
     ),
     pay as (
       select date_trunc('month', p.payment_date)::date as month, sum(p.amount) as collected
         from payments p join invoices i on i.id = p.invoice_id join subscriptions s on s.id = i.subscription_id
        where p.payment_date >= (select min(month) from m) ${and}
        group by 1
     )
     select to_char(m.month, 'YYYY-MM') as month,
            coalesce(inv.invoiced, 0)::text as invoiced,
            coalesce(inv.invoices, 0) as invoices,
            coalesce(pay.collected, 0)::text as collected
       from m left join inv using (month) left join pay using (month)
      order by m.month`,
    w.params,
  );
  return rows;
}

export async function byPlan(f, today = todayIST()) {
  const { from, to } = defaultRange(f, today);
  const w = scope(f);
  const todayP = w.param(today);
  const fromP = w.param(from);
  const toP = w.param(to);
  const and = w.parts.length ? `and ${w.parts.join(' and ')}` : '';
  const { rows } = await query(
    `with ${mrrCte(w, todayP)},
     counts as (
       select s.plan_id,
              count(*) filter (where s.status = 'active') as active_subscriptions,
              count(*) filter (where s.status = 'paused') as paused_subscriptions
         from subscriptions s where true ${and} group by s.plan_id
     ),
     inv as (
       select s.plan_id, sum(i.total) as invoiced
         from invoices i join subscriptions s on s.id = i.subscription_id
        where i.status in ('confirmed', 'paid') and i.invoice_date between ${fromP} and ${toP} ${and}
        group by s.plan_id
     ),
     mrr as (select plan_id, sum(mrr) as mrr from sub_mrr group by plan_id)
     select pl.id as plan_id, pl.name as plan_name, pl.billing_period,
            coalesce(c.active_subscriptions, 0) as active_subscriptions,
            coalesce(c.paused_subscriptions, 0) as paused_subscriptions,
            round(coalesce(mrr.mrr, 0), 2)::text as mrr,
            coalesce(inv.invoiced, 0)::text as invoiced
       from plans pl
       left join counts c on c.plan_id = pl.id
       left join mrr on mrr.plan_id = pl.id
       left join inv on inv.plan_id = pl.id
      where c.plan_id is not null or inv.plan_id is not null
      order by coalesce(mrr.mrr, 0) desc, pl.name`,
    w.params,
  );
  return { from, to, rows };
}

export async function topCustomers(f, today = todayIST()) {
  const { from, to } = defaultRange(f, today);
  const limit = f.limit ?? 10;
  const w = scope(f);
  const fromP = w.param(from);
  const toP = w.param(to);
  const and = w.parts.length ? `and ${w.parts.join(' and ')}` : '';
  const { rows } = await query(
    `select c.id as customer_id, c.name,
            sum(i.total)::text as invoiced,
            sum(i.amount_paid)::text as paid,
            sum(i.amount_due) filter (where i.status = 'confirmed')::text as outstanding,
            count(*) as invoices
       from invoices i
       join subscriptions s on s.id = i.subscription_id
       join customers c on c.id = i.customer_id
      where i.status in ('confirmed', 'paid') and i.invoice_date between ${fromP} and ${toP} ${and}
      group by c.id
      order by sum(i.total) desc, c.name
      limit ${Number(limit)}`,
    w.params,
  );
  return { from, to, rows: rows.map((r) => ({ ...r, outstanding: r.outstanding ?? '0.00' })) };
}
