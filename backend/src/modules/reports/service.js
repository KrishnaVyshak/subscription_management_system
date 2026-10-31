import { query } from '../../config/db.js';
import { todayIST } from '../../lib/dates.js';

// Monthly factor per subscription row `s` (yearly 1/12, weekly 52/12, daily 365/12, ÷ interval).
const FACTOR = `(case s.billing_period
    when 'monthly' then 1::numeric
    when 'yearly' then 1::numeric / 12
    when 'weekly' then 52::numeric / 12
    when 'daily' then 365::numeric / 12 end / s.interval_count)`;

/**
 * Plan/customer filters as SQL fragments for each table, sharing one parameter list.
 * Customer filters hit each table's own customer_id; the plan filter adds a subscription
 * lookup only when it is used, so unfiltered reports never join subscriptions.
 */
function scope(f) {
  const params = [];
  const p = (v) => {
    params.push(v);
    return `$${params.length}`;
  };
  const plan = f.planId ? p(f.planId) : null;
  const customer = f.customerId ? p(f.customerId) : null;
  const and = (parts) => parts.filter(Boolean).map((x) => ` and ${x}`).join('');
  return {
    params,
    p,
    subs: and([plan && `s.plan_id = ${plan}`, customer && `s.customer_id = ${customer}`]),
    invoices: and([
      plan && `i.subscription_id in (select id from subscriptions where plan_id = ${plan})`,
      customer && `i.customer_id = ${customer}`,
    ]),
    payments: and([
      plan &&
        `p.invoice_id in (select ix.id from invoices ix join subscriptions sx on sx.id = ix.subscription_id
                           where sx.plan_id = ${plan})`,
      customer && `p.customer_id = ${customer}`,
    ]),
  };
}

// Unrounded MRR per active subscription from its lines in effect on `today`.
const mrrCte = (subsScope, todayP) => `
  sub_mrr as (
    select s.id, s.plan_id, s.customer_id,
           coalesce(sum(l.quantity * l.unit_price), 0) * ${FACTOR} as mrr
      from subscriptions s
      left join subscription_lines l on l.subscription_id = s.id
           and (l.starts_on is null or l.starts_on <= ${todayP})
           and (l.ends_on is null or l.ends_on >= ${todayP})
     where s.status = 'active' ${subsScope}
     group by s.id
  )`;

export function defaultRange(f, today = todayIST()) {
  return { from: f.from ?? `${today.slice(0, 7)}-01`, to: f.to ?? today };
}

/**
 * Stock figures (active, paused, MRR, ARR, outstanding, overdue) are as of today; flow figures
 * (invoiced, collected, new, churned) cover from..to. All aggregated in one statement.
 */
export async function summary(f, today = todayIST()) {
  const { from, to } = defaultRange(f, today);
  const sc = scope(f);
  const [todayP, fromP, toP] = [sc.p(today), sc.p(from), sc.p(to)];
  const { rows } = await query(
    `with ${mrrCte(sc.subs, todayP)}
     select
       (select count(*) from subscriptions s where s.status = 'active' ${sc.subs}) as active_subscriptions,
       (select count(*) from subscriptions s where s.status = 'paused' ${sc.subs}) as paused_subscriptions,
       (select round(coalesce(sum(mrr), 0), 2)::text from sub_mrr) as mrr,
       (select round(coalesce(sum(mrr), 0) * 12, 2)::text from sub_mrr) as arr,
       (select coalesce(sum(i.total), 0)::text from invoices i
         where i.status in ('confirmed', 'paid') and i.invoice_date between ${fromP} and ${toP} ${sc.invoices})
         as invoiced,
       (select coalesce(sum(p.amount), 0)::text from payments p
         where p.payment_date between ${fromP} and ${toP} ${sc.payments}) as collected,
       o.outstanding, o.overdue, o.overdue_invoices,
       (select count(*) from subscriptions s
         where s.billing_anchor_date is not null and s.start_date between ${fromP} and ${toP} ${sc.subs})
         as new_subscriptions,
       (select count(*) from subscriptions s
         where s.status = 'closed' and s.billing_anchor_date is not null
           and s.closed_at between ${fromP} and ${toP} ${sc.subs}) as churned_subscriptions
     from (
       -- Open invoices; same overdue rule as invoice_overview (served by invoices_open_idx).
       select coalesce(sum(i.amount_due), 0)::text as outstanding,
              coalesce(sum(i.amount_due) filter (where i.due_date < ${todayP}::date), 0)::text as overdue,
              count(*) filter (where i.due_date < ${todayP}::date and i.amount_due > 0) as overdue_invoices
         from invoices i where i.status = 'confirmed' ${sc.invoices}
     ) o`,
    sc.params,
  );
  return { from, to, ...rows[0] };
}

// Last `months` calendar months (including empty ones) of invoiced and collected amounts.
export async function revenueTrend(f, today = todayIST()) {
  const sc = scope(f);
  const [todayP, monthsP] = [sc.p(today), sc.p(f.months ?? 12)];
  const { rows } = await query(
    `with m as (
       select generate_series(
                date_trunc('month', ${todayP}::date) - make_interval(months => ${monthsP}::int - 1),
                date_trunc('month', ${todayP}::date),
                interval '1 month')::date as month
     ),
     inv as (
       select date_trunc('month', i.invoice_date)::date as month, sum(i.total) as invoiced, count(*) as invoices
         from invoices i
        where i.status in ('confirmed', 'paid') and i.invoice_date >= (select min(month) from m) ${sc.invoices}
        group by 1
     ),
     pay as (
       select date_trunc('month', p.payment_date)::date as month, sum(p.amount) as collected
         from payments p
        where p.payment_date >= (select min(month) from m) ${sc.payments}
        group by 1
     )
     select to_char(m.month, 'YYYY-MM') as month,
            coalesce(inv.invoiced, 0)::text as invoiced,
            coalesce(inv.invoices, 0) as invoices,
            coalesce(pay.collected, 0)::text as collected
       from m left join inv using (month) left join pay using (month)
      order by m.month`,
    sc.params,
  );
  return rows;
}

export async function byPlan(f, today = todayIST()) {
  const { from, to } = defaultRange(f, today);
  const sc = scope(f);
  const [todayP, fromP, toP] = [sc.p(today), sc.p(from), sc.p(to)];
  const { rows } = await query(
    `with ${mrrCte(sc.subs, todayP)},
     counts as (
       select s.plan_id,
              count(*) filter (where s.status = 'active') as active_subscriptions,
              count(*) filter (where s.status = 'paused') as paused_subscriptions
         from subscriptions s where true ${sc.subs} group by s.plan_id
     ),
     inv as (
       select s.plan_id, sum(i.total) as invoiced
         from invoices i join subscriptions s on s.id = i.subscription_id
        where i.status in ('confirmed', 'paid') and i.invoice_date between ${fromP} and ${toP} ${sc.subs}
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
    sc.params,
  );
  return { from, to, rows };
}

export async function topCustomers(f, today = todayIST()) {
  const { from, to } = defaultRange(f, today);
  const limit = Number(f.limit ?? 10);
  const sc = scope(f);
  const [fromP, toP] = [sc.p(from), sc.p(to)];
  const { rows } = await query(
    `select c.id as customer_id, c.name, t.invoiced::text, t.paid::text,
            coalesce(t.outstanding, 0)::text as outstanding, t.invoices
       from (select i.customer_id, sum(i.total) as invoiced, sum(i.amount_paid) as paid,
                    sum(i.amount_due) filter (where i.status = 'confirmed') as outstanding,
                    count(*) as invoices
               from invoices i
              where i.status in ('confirmed', 'paid') and i.invoice_date between ${fromP} and ${toP} ${sc.invoices}
              group by i.customer_id
              order by sum(i.total) desc
              limit ${limit}) t
       join customers c on c.id = t.customer_id
      order by t.invoiced desc, c.name`,
    sc.params,
  );
  return { from, to, rows };
}
