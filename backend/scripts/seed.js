// Demo data: staff, customers (5 with portal logins), catalog, templates, discounts,
// subscriptions in every status, invoices and payments (paid, partial, overdue).
// Idempotent: catalog and people are upserted; subscriptions are created once (tagged in
// notes); billing and payments only fill what is missing. Usage: npm run seed
import { pool, query } from '../src/config/db.js';
import { addDays, addMonths, todayIST } from '../src/lib/dates.js';
import { runBilling } from '../src/modules/billing/service.js';
import { attach } from '../src/modules/discounts/service.js';
import { record as recordPayment } from '../src/modules/payments/service.js';
import * as subscriptions from '../src/modules/subscriptions/service.js';
import { ensureUser } from './lib/ensureUser.js';

const DEMO_PASSWORD = 'Demo@12345';
const today = todayIST();

async function one(sql, params) {
  return (await query(sql, params)).rows[0];
}

// Finds a row by case-insensitive name (or other key) and inserts it when missing.
async function upsert(table, keyColumn, keyValue, fields) {
  const found = await one(`select * from ${table} where lower(${keyColumn}::text) = lower($1)`, [keyValue]);
  const cols = Object.keys(fields);
  if (found) {
    if (cols.length) {
      const sets = cols.map((c, i) => `${c} = $${i + 2}`).join(', ');
      return one(`update ${table} set ${sets} where id = $1 returning *`, [found.id, ...cols.map((c) => fields[c])]);
    }
    return found;
  }
  const all = [keyColumn, ...cols];
  return one(
    `insert into ${table} (${all.join(', ')}) values (${all.map((_, i) => `$${i + 1}`).join(', ')}) returning *`,
    [keyValue, ...cols.map((c) => fields[c])],
  );
}

async function seedPeople() {
  const staff = [];
  for (const [email, name] of [
    ['priya.staff@brightloop.test', 'Priya Nair'],
    ['rahul.staff@brightloop.test', 'Rahul Mehta'],
  ]) {
    const { id } = await ensureUser({ email, password: DEMO_PASSWORD, fullName: name, role: 'staff' });
    staff.push({ id, role: 'staff' });
  }

  const people = [
    ['Acme Analytics', 'ananya@acme-analytics.test', 'Ananya Rao', true, '29AAACA1234A1Z5'],
    ['Bluepeak Logistics', 'vikram@bluepeak.test', 'Vikram Shah', true, '27AABCB2345B1Z6'],
    ['Cedar Health', 'meera@cedarhealth.test', 'Meera Iyer', true, null],
    ['Delta Retail', 'arjun@deltaretail.test', 'Arjun Das', true, '33AACCD3456C1Z7'],
    ['Evergreen Foods', 'kavya@evergreen.test', 'Kavya Menon', true, null],
    ['Falcon Fintech', 'rohan@falconfin.test', 'Rohan Gupta', false, '07AADCF4567D1Z8'],
    ['Granite Builders', 'sneha@granite.test', 'Sneha Kulkarni', false, null],
    ['Horizon Travel', 'aditya@horizon.test', 'Aditya Joshi', false, null],
    ['Indigo Media', 'neha@indigomedia.test', 'Neha Kapoor', false, '19AAECI5678E1Z9'],
    ['Juniper Labs', 'karan@juniperlabs.test', 'Karan Malhotra', false, null],
  ];
  const customers = [];
  for (const [company, email, contact, portal, gstin] of people) {
    const details = {
      name: company,
      phone: `+91 98${String(customers.length).padStart(2, '0')}0 1${String(customers.length).padStart(4, '0')}`,
      billingAddress: `${10 + customers.length} MG Road, Bengaluru 5600${String(customers.length).padStart(2, '0')}`,
      gstin,
    };
    if (portal) {
      await ensureUser({ email, password: DEMO_PASSWORD, fullName: contact, role: 'customer', customer: details });
    } else {
      await upsert('customers', 'email', email, {
        name: company,
        phone: details.phone,
        billing_address: details.billingAddress,
        gstin,
      });
    }
    customers.push(await one('select * from customers where lower(email) = $1', [email]));
  }
  return { staff, customers };
}

async function seedCatalog() {
  const term = (name, days) => upsert('payment_terms', 'name', name, { due_days: days, is_active: true });
  const terms = { immediate: await term('Immediate', 0), net15: await term('Net 15', 15), net30: await term('Net 30', 30) };
  const tax = (name, rate) => upsert('taxes', 'name', name, { type: 'percent', rate, price_included: false, is_active: true });
  const gst18 = await tax('GST 18%', 18);
  const gst5 = await tax('GST 5%', 5);

  const brand = await upsert('product_attributes', 'name', 'Brand', { is_active: true });
  for (const [value, extra] of [
    ['Odoo', 560],
    ['Generic', 0],
  ]) {
    await query(
      `insert into attribute_values (attribute_id, value, extra_price) values ($1, $2, $3)
       on conflict (attribute_id, value) do update set extra_price = excluded.extra_price`,
      [brand.id, value, extra],
    );
  }

  const product = async (name, type, price, taxId) => {
    const p = await upsert('products', 'name', name, { type, sales_price: price, is_active: true });
    await query('insert into product_taxes (product_id, tax_id) values ($1, $2) on conflict do nothing', [p.id, taxId]);
    return p;
  };
  const products = {
    crm: await product('CRM Suite', 'service', 1000, gst18.id),
    hr: await product('HR Cloud', 'service', 800, gst18.id),
    storage: await product('Extra Storage', 'addon', 200, gst18.id),
    support: await product('Priority Support', 'addon', 500, gst18.id),
    kit: await product('Onboarding Kit', 'goods', 1500, gst5.id),
  };

  // CRM Suite variants by brand.
  const values = (await query('select id, value from attribute_values where attribute_id = $1', [brand.id])).rows;
  for (const v of values) {
    await query(
      `insert into product_variants (product_id, name, signature, sku) values ($1, $2, $3, $4)
       on conflict (product_id, signature) do nothing`,
      [products.crm.id, `CRM Suite (${v.value})`, v.id, `CRM-${v.value.toUpperCase()}`],
    );
    await query(
      `insert into product_variant_values (variant_id, attribute_value_id)
       select id, $2::uuid from product_variants where product_id = $1 and signature = $3 on conflict do nothing`,
      [products.crm.id, v.id, v.id],
    );
  }

  const plan = (name, productId, price, period, flags) =>
    upsert('plans', 'name', name, {
      product_id: productId,
      price,
      billing_period: period,
      interval_count: 1,
      min_quantity: flags.minQuantity ?? 1,
      auto_close: flags.autoClose ?? false,
      closable: flags.closable ?? false,
      pausable: flags.pausable ?? false,
      renewable: flags.renewable ?? false,
      is_active: true,
    });
  const plans = {
    crmMonthly: await plan('CRM Monthly', products.crm.id, 1000, 'monthly', { closable: true, pausable: true, renewable: true }),
    crmYearly: await plan('CRM Yearly', products.crm.id, 10000, 'yearly', { autoClose: true, renewable: true }),
    hrWeekly: await plan('HR Weekly', products.hr.id, 200, 'weekly', { minQuantity: 5 }),
    dailyTrial: await plan('Daily Trial', products.crm.id, 50, 'daily', { autoClose: true }),
  };

  const template = async (name, planId, termId, validity, lines) => {
    const t = await upsert('quotation_templates', 'name', name, {
      plan_id: planId,
      payment_term_id: termId,
      validity_days: validity,
      is_active: true,
    });
    await query('delete from template_lines where template_id = $1', [t.id]);
    for (const [i, [productId, qty]] of lines.entries()) {
      await query(
        'insert into template_lines (template_id, product_id, quantity, sort_order) values ($1, $2, $3, $4)',
        [t.id, productId, qty, i],
      );
    }
    return t;
  };
  const templates = {
    crmStarter: await template('CRM Starter', plans.crmMonthly.id, terms.net15.id, 30, [
      [products.crm.id, 3],
      [products.storage.id, 1],
    ]),
    hrTeam: await template('HR Team', plans.hrWeekly.id, terms.net30.id, 15, [
      [products.hr.id, 10],
      [products.support.id, 1],
    ]),
  };

  const discount = async (name, fields, productIds = []) => {
    const d = await upsert('discounts', 'name', name, fields);
    for (const pid of productIds) {
      await query('insert into discount_products (discount_id, product_id) values ($1, $2) on conflict do nothing', [d.id, pid]);
    }
    return d;
  };
  const discounts = {
    bulk: await discount('Bulk CRM 10%', { type: 'percent', value: 10, scope: 'product', min_quantity: 10 }, [products.crm.id]),
    welcome: await discount('Welcome ₹500', { type: 'fixed', value: 500, scope: 'subscription', usage_limit: 2 }),
    expired: await discount('Diwali 2025', {
      type: 'percent',
      value: 15,
      scope: 'subscription',
      start_date: '2025-10-15',
      end_date: '2025-11-15',
      is_active: false,
    }),
  };

  await query(
    `update settings set value = $1 where key = 'company'`,
    [
      JSON.stringify({
        name: 'Brightloop',
        address: '4th Floor, Prestige Tech Park, Bengaluru 560103',
        email: 'billing@brightloop.test',
        phone: '+91 80 4000 1234',
        gstin: '29AAKCB1234M1Z2',
      }),
    ],
  );
  return { terms, products, plans, templates, discounts };
}

// Creates one subscription (once, keyed by its notes tag) and walks it to `status`.
async function sub(staffUser, tag, { customer, planId, templateId, startDate, expiryDate, lines, status, termId }) {
  const existing = await one('select id from subscriptions where notes = $1', [`seed:${tag}`]);
  if (existing) return { id: existing.id, created: false };
  const created = await subscriptions.create(
    { customerId: customer.id, planId, templateId, startDate, expiryDate, paymentTermId: termId, notes: `seed:${tag}` },
    staffUser,
    startDate,
  );
  if (lines) await subscriptions.update(created.id, { lines }, staffUser, startDate);
  const steps = { draft: [], quotation: ['quotation'], confirmed: ['quotation', 'confirmed'] }[status] ?? [
    'quotation',
    'confirmed',
    'active',
  ];
  for (const to of steps) await subscriptions.transition(created.id, { to }, staffUser, startDate);
  return { id: created.id, created: true };
}

async function seedSubscriptions(staff, customers, cat) {
  const [priya, rahul] = staff;
  const c = customers;
  const P = Object.fromEntries(Object.entries(cat.products).map(([k, v]) => [k, v.id]));
  const s = {};

  s.bulk = await sub(priya, 'acme-crm', {
    customer: c[0],
    planId: cat.plans.crmMonthly.id,
    startDate: addMonths(today, -4),
    termId: cat.terms.net15.id,
    lines: [
      { productId: P.crm, quantity: 10 },
      { productId: P.storage, quantity: 2 },
    ],
  });
  s.yearly = await sub(priya, 'bluepeak-yearly', {
    customer: c[1],
    planId: cat.plans.crmYearly.id,
    startDate: addMonths(today, -2),
    expiryDate: addDays(addMonths(today, 10), -1),
    termId: cat.terms.net30.id,
  });
  s.hr = await sub(rahul, 'cedar-hr', {
    customer: c[2],
    planId: cat.plans.hrWeekly.id,
    startDate: addDays(today, -42),
    termId: cat.terms.immediate.id,
    lines: [
      { productId: P.hr, quantity: 6 },
      { productId: P.support, quantity: 1 },
    ],
  });
  s.paused = await sub(rahul, 'delta-paused', {
    customer: c[3],
    planId: cat.plans.crmMonthly.id,
    startDate: addMonths(today, -2),
    termId: cat.terms.net15.id,
  });
  s.welcome = await sub(priya, 'evergreen-welcome', {
    customer: c[4],
    planId: cat.plans.crmMonthly.id,
    startDate: addMonths(today, -3),
    termId: cat.terms.immediate.id,
    lines: [{ productId: P.crm, quantity: 2 }],
  });
  s.quote = await sub(priya, 'falcon-quote', {
    customer: c[5],
    templateId: cat.templates.crmStarter.id,
    startDate: addDays(today, 7),
    status: 'quotation',
  });
  s.draft = await sub(rahul, 'granite-draft', {
    customer: c[6],
    templateId: cat.templates.hrTeam.id,
    startDate: addDays(today, 14),
    status: 'draft',
  });
  s.confirmed = await sub(priya, 'horizon-confirmed', {
    customer: c[7],
    planId: cat.plans.crmMonthly.id,
    startDate: addDays(today, 7),
    termId: cat.terms.net15.id,
    status: 'confirmed',
  });
  s.closed = await sub(rahul, 'indigo-closed', {
    customer: c[8],
    planId: cat.plans.crmMonthly.id,
    startDate: addMonths(today, -3),
    termId: cat.terms.net15.id,
  });
  s.trial = await sub(priya, 'juniper-trial', {
    customer: c[9],
    planId: cat.plans.dailyTrial.id,
    startDate: addDays(today, -5),
    expiryDate: addDays(today, 9),
    termId: cat.terms.immediate.id,
  });
  // Indigo also has a CRM Monthly that is overdue and unpaid.
  s.overdue = await sub(rahul, 'indigo-overdue', {
    customer: c[8],
    planId: cat.plans.crmMonthly.id,
    startDate: addMonths(today, -2),
    termId: cat.terms.immediate.id,
  });

  const fresh = s.bulk.created;
  if (fresh) {
    await attach(s.welcome.id, cat.discounts.welcome.id, priya.id);
    // History: bill up to a month ago, close Indigo's first subscription, bill to 10 days
    // ago, pause Delta, then bill up to today.
    await runBilling({ asOfDate: addMonths(today, -1), source: 'seed' });
    await subscriptions.transition(
      s.closed.id,
      { to: 'closed', reason: 'customer_request', note: 'Moved to another vendor' },
      priya,
      addMonths(today, -1),
    );
    await runBilling({ asOfDate: addDays(today, -10), source: 'seed' });
    await subscriptions.transition(s.paused.id, { to: 'paused', note: 'Seasonal pause' }, rahul, addDays(today, -10));
  }
  await runBilling({ asOfDate: today, source: 'seed' });
  return s;
}

async function seedPayments(staff, s) {
  const [priya] = staff;
  const unpaid = async (subId) =>
    (
      await query(
        `select i.id, i.amount_due, i.invoice_date from invoices i
          where i.subscription_id = $1 and i.status = 'confirmed'
            and not exists (select 1 from payments p where p.invoice_id = i.id)
          order by i.period_start`,
        [subId],
      )
    ).rows;
  const pay = (inv, amount, method = 'bank_transfer') =>
    recordPayment(inv.id, { method, amount, paymentDate: inv.invoice_date, note: 'seed' }, priya, today);

  // Acme: everything but the latest invoice paid.
  const acme = await unpaid(s.bulk.id);
  for (const inv of acme.slice(0, -1)) await pay(inv, inv.amount_due);
  // Bluepeak: yearly paid in full by UPI.
  for (const inv of await unpaid(s.yearly.id)) await pay(inv, inv.amount_due, 'upi');
  // Cedar: oldest half paid (partial), the rest left open (overdue).
  const cedar = await unpaid(s.hr.id);
  if (cedar[0]) await pay(cedar[0], (Number(cedar[0].amount_due) / 2).toFixed(2), 'cheque');
  // Delta and Evergreen: first invoice paid.
  for (const subId of [s.paused.id, s.welcome.id]) {
    const [first] = await unpaid(subId);
    if (first) await pay(first, first.amount_due, 'card');
  }
  // Indigo's closed subscription: all paid. Indigo's second one stays overdue.
  for (const inv of await unpaid(s.closed.id)) await pay(inv, inv.amount_due);
}

try {
  const { staff, customers } = await seedPeople();
  const cat = await seedCatalog();
  const s = await seedSubscriptions(staff, customers, cat);
  await seedPayments(staff, s);
  const counts = await one(`
    select (select count(*) from customers) as customers,
           (select count(*) from subscriptions) as subscriptions,
           (select count(*) from invoices) as invoices,
           (select count(*) from payments) as payments`);
  console.log('Seed complete:', counts);
  console.log(`Staff and portal logins use the password ${DEMO_PASSWORD}`);
} catch (err) {
  console.error('Seed failed:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
