// Performance data set: 2k customers, 10k subscriptions, ~100k invoices over the last 12
// months (~85 % paid), inserted in batches of 1,000. Needs the demo catalog (npm run seed).
// Subscriptions are left fully billed up to today, so a billing run afterwards finds nothing.
// Usage: npm run seed:large
import crypto from 'node:crypto';
import { faker } from '@faker-js/faker';
import { pool, query } from '../src/config/db.js';
import { periodStart } from '../src/domain/periods.js';
import { addDays, addMonths, todayIST } from '../src/lib/dates.js';
import { D, fmt, round2 } from '../src/lib/money.js';

const BATCH = 1000;
const today = todayIST();
faker.seed(20261031);
const uuid = () => crypto.randomUUID();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const int = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

// Multi-row INSERT, BATCH rows per statement.
async function insertRows(table, columns, rows) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const params = [];
    const values = chunk.map((row) => {
      const ph = columns.map((c) => {
        params.push(row[c]);
        return `$${params.length}`;
      });
      return `(${ph.join(', ')})`;
    });
    await query(`insert into ${table} (${columns.join(', ')}) values ${values.join(', ')}`, params);
  }
  console.log(`  ${table}: ${rows.length.toLocaleString('en-IN')}`);
}

async function catalog() {
  const { rows } = await query(
    `select pl.name, pl.id, pl.product_id, pl.price, pl.billing_period, pl.interval_count, p.name as product_name
       from plans pl join products p on p.id = pl.product_id
      where pl.name in ('CRM Monthly', 'CRM Yearly', 'HR Weekly')`,
  );
  const plans = Object.fromEntries(rows.map((r) => [r.name, r]));
  const storage = (await query(`select id, name, sales_price from products where name = 'Extra Storage'`)).rows[0];
  const gst = (await query(`select id, name, rate from taxes where name = 'GST 18%'`)).rows[0];
  const term = (await query(`select id, due_days from payment_terms where name = 'Net 15'`)).rows[0];
  const company = (await query(`select value from settings where key = 'company'`)).rows[0]?.value ?? {};
  if (Object.keys(plans).length < 3 || !storage || !gst || !term) {
    throw new Error('Demo catalog missing: run `npm run seed` first.');
  }
  return { plans, storage, gst, term, company };
}

// Status mix for 10,000 subscriptions (≈100k invoices).
const MIX = [
  ['active', 'CRM Monthly', 7600],
  ['active', 'CRM Yearly', 600],
  ['active', 'HR Weekly', 400],
  ['paused', 'CRM Monthly', 400],
  ['closed', 'CRM Monthly', 500],
  ['draft', 'CRM Monthly', 300],
  ['quotation', 'CRM Monthly', 100],
  ['confirmed', 'CRM Monthly', 100],
];

function startFor(status, planName) {
  if (status === 'draft' || status === 'quotation' || status === 'confirmed') return addDays(today, int(1, 30));
  if (planName === 'CRM Yearly') return addDays(today, -int(0, 364));
  if (planName === 'HR Weekly') return addDays(today, -int(0, 56));
  return addDays(addMonths(today, -12), int(0, 27));
}

try {
  const existing = await query(`select count(*) as n from customers where email like 'large-%@example.test'`);
  if (existing.rows[0].n > 0) {
    console.log('Large data set already loaded (customers large-*@example.test). Run npm run reset-demo first to reload.');
    process.exit(0);
  }
  const cat = await catalog();
  const started = Date.now();
  console.log('Generating…');

  const customers = Array.from({ length: 2000 }, (_, i) => ({
    id: uuid(),
    name: `${faker.company.name()} ${i + 1}`.slice(0, 200),
    email: `large-${i + 1}@example.test`,
    phone: faker.phone.number(),
    billing_address: `${faker.location.streetAddress()}, ${faker.location.city()}`,
  }));

  const subs = [];
  const subLines = [];
  const lineTaxes = [];
  const logs = [];
  const invoices = [];
  const invLines = [];
  const invLineTaxes = [];
  const payments = [];
  let subNo = 0;

  for (const [status, planName, count] of MIX) {
    const plan = cat.plans[planName];
    for (let k = 0; k < count; k += 1) {
      subNo += 1;
      const customer = customers[subNo % customers.length];
      const id = uuid();
      const start = startFor(status, planName);
      const running = ['active', 'paused', 'closed'].includes(status);
      const qty = planName === 'HR Weekly' ? int(5, 20) : int(1, 5);
      const lines = [
        { id: uuid(), product_id: plan.product_id, description: plan.product_name, quantity: qty, unit_price: plan.price, is_plan_line: true },
      ];
      if (Math.random() < 0.2) {
        lines.push({ id: uuid(), product_id: cat.storage.id, description: cat.storage.name, quantity: int(1, 3), unit_price: cat.storage.sales_price, is_plan_line: false });
      }

      // Bill every period that started on or before the stop day.
      let stop = today;
      let pausedAt = null;
      let closedAt = null;
      if (status === 'paused') pausedAt = stop = addDays(today, -int(20, 90));
      if (status === 'closed') closedAt = stop = addDays(today, -int(30, 200));
      let n = 0;
      if (running) {
        while (periodStart(start, plan.billing_period, plan.interval_count, n) <= stop) {
          const pStart = periodStart(start, plan.billing_period, plan.interval_count, n);
          const pEnd = addDays(periodStart(start, plan.billing_period, plan.interval_count, n + 1), -1);
          const invoiceId = uuid();
          let subtotal = new D(0);
          let tax = new D(0);
          for (const [i, l] of lines.entries()) {
            const ls = round2(new D(l.unit_price).times(l.quantity));
            const lt = round2(ls.times(cat.gst.rate).div(100));
            subtotal = subtotal.plus(ls);
            tax = tax.plus(lt);
            const lineId = uuid();
            invLines.push({
              id: lineId, invoice_id: invoiceId, subscription_line_id: l.id, product_id: l.product_id,
              description: l.description, quantity: l.quantity, unit_price: l.unit_price, line_subtotal: fmt(ls),
              discount_amount: '0.00', taxable_amount: fmt(ls), tax_amount: fmt(lt), amount: fmt(ls.plus(lt)), sort_order: i,
            });
            invLineTaxes.push({
              invoice_line_id: lineId, tax_id: cat.gst.id, tax_name: cat.gst.name, type: 'percent',
              rate: cat.gst.rate, price_included: false, amount: fmt(lt),
            });
          }
          const total = subtotal.plus(tax);
          const due = addDays(pStart, cat.term.due_days);
          // ~85 % paid overall; the latest invoices are the ones most often still open.
          const recent = due >= addDays(today, -10);
          const paid = Math.random() < (recent ? 0.35 : 0.88);
          invoices.push({
            id: invoiceId, subscription_id: id, customer_id: customer.id, status: paid ? 'paid' : 'confirmed',
            period_start: pStart, period_end: pEnd, invoice_date: pStart, due_date: due,
            subtotal: fmt(subtotal), discount_total: '0.00', tax_total: fmt(tax), total: fmt(total),
            amount_paid: paid ? fmt(total) : '0.00',
            customer_snapshot: JSON.stringify({ name: customer.name, email: customer.email, billing_address: customer.billing_address }),
            company_snapshot: JSON.stringify(cat.company),
          });
          if (paid) {
            const payDate = addDays(pStart, int(0, 14));
            payments.push({
              invoice_id: invoiceId, customer_id: customer.id, method: pick(['upi', 'bank_transfer', 'card', 'cheque', 'cash']),
              amount: fmt(total), payment_date: payDate > today ? today : payDate,
            });
          }
          n += 1;
        }
      }

      subs.push({
        id, number: null, customer_id: customer.id, plan_id: plan.id, status,
        billing_period: plan.billing_period, interval_count: plan.interval_count, start_date: start,
        billing_anchor_date: running ? start : null,
        next_invoice_date: status === 'active' || status === 'paused' ? periodStart(start, plan.billing_period, plan.interval_count, n) : null,
        periods_billed: n, payment_term_id: cat.term.id, paused_at: pausedAt, closed_at: closedAt,
        close_reason: closedAt ? pick(['customer_request', 'manual', 'non_payment']) : null,
        quote_valid_until: status === 'quotation' ? addDays(today, 30) : null, notes: 'large-seed',
      });
      for (const l of lines) {
        subLines.push({ ...l, subscription_id: id });
        lineTaxes.push({ line_id: l.id, tax_id: cat.gst.id });
      }
      logs.push({ subscription_id: id, from_status: null, to_status: status, note: 'Large seed' });
    }
  }

  console.log(`Inserting (batches of ${BATCH})…`);
  await insertRows('customers', ['id', 'name', 'email', 'phone', 'billing_address'], customers);

  // Subscription and invoice numbers come from the same sequences the API uses.
  const subColumns = [
    'id', 'number', 'customer_id', 'plan_id', 'status', 'billing_period', 'interval_count', 'start_date',
    'billing_anchor_date', 'next_invoice_date', 'periods_billed', 'payment_term_id', 'paused_at', 'closed_at',
    'close_reason', 'quote_valid_until', 'notes',
  ];
  for (let i = 0; i < subs.length; i += BATCH) {
    const chunk = subs.slice(i, i + BATCH);
    const numbers = await query(
      `select public.next_doc_number('SUB', d::date) as n from unnest($1::text[]) as d`,
      [chunk.map((s) => s.start_date)],
    );
    chunk.forEach((s, j) => (s.number = numbers.rows[j].n));
  }
  await insertRows('subscriptions', subColumns, subs);
  await insertRows(
    'subscription_lines',
    ['id', 'subscription_id', 'product_id', 'description', 'quantity', 'unit_price', 'is_plan_line'],
    subLines,
  );
  await insertRows('subscription_line_taxes', ['line_id', 'tax_id'], lineTaxes);
  await insertRows('subscription_status_log', ['subscription_id', 'from_status', 'to_status', 'note'], logs);

  for (let i = 0; i < invoices.length; i += BATCH) {
    const chunk = invoices.slice(i, i + BATCH);
    const numbers = await query(
      `select public.next_doc_number('INV', d::date) as n from unnest($1::text[]) as d`,
      [chunk.map((r) => r.invoice_date)],
    );
    chunk.forEach((r, j) => (r.number = numbers.rows[j].n));
  }
  await insertRows(
    'invoices',
    [
      'id', 'number', 'subscription_id', 'customer_id', 'status', 'period_start', 'period_end', 'invoice_date',
      'due_date', 'subtotal', 'discount_total', 'tax_total', 'total', 'amount_paid', 'customer_snapshot',
      'company_snapshot',
    ],
    invoices,
  );
  await query(
    `update invoices set confirmed_at = invoice_date::timestamptz,
            paid_at = case when status = 'paid' then (invoice_date + 7)::timestamptz end
      where customer_id in (select id from customers where email like 'large-%@example.test')`,
  );
  await insertRows(
    'invoice_lines',
    [
      'id', 'invoice_id', 'subscription_line_id', 'product_id', 'description', 'quantity', 'unit_price',
      'line_subtotal', 'discount_amount', 'taxable_amount', 'tax_amount', 'amount', 'sort_order',
    ],
    invLines,
  );
  await insertRows(
    'invoice_line_taxes',
    ['invoice_line_id', 'tax_id', 'tax_name', 'type', 'rate', 'price_included', 'amount'],
    invLineTaxes,
  );
  await insertRows('payments', ['invoice_id', 'customer_id', 'method', 'amount', 'payment_date'], payments);

  await query('analyze');
  const paidShare = ((payments.length / invoices.length) * 100).toFixed(1);
  console.log(
    `Done in ${Math.round((Date.now() - started) / 1000)} s: ${customers.length} customers, ${subs.length} subscriptions, ` +
      `${invoices.length.toLocaleString('en-IN')} invoices (${paidShare} % paid).`,
  );
} catch (err) {
  console.error('seed-large failed:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
