import { query } from '../../config/db.js';

async function one(sql, params) {
  const { rows } = await query(sql, params);
  return rows[0];
}

// A small catalog close to the demo seed. Returns ids keyed by name.
export async function seedCatalog() {
  const gst18 = await one(
    `insert into taxes (name, type, rate) values ('GST 18%', 'percent', 18) returning id`,
  );
  const gst5 = await one(`insert into taxes (name, type, rate) values ('GST 5%', 'percent', 5) returning id`);
  const net15 = await one(`insert into payment_terms (name, due_days) values ('Net 15', 15) returning id`);
  const immediate = await one(
    `insert into payment_terms (name, due_days) values ('Immediate', 0) returning id`,
  );

  const product = (name, type, price) =>
    one(`insert into products (name, type, sales_price) values ($1, $2, $3) returning id`, [
      name,
      type,
      price,
    ]);
  const crm = await product('CRM Suite', 'service', '1000');
  const hr = await product('HR Cloud', 'service', '800');
  const storage = await product('Extra Storage', 'addon', '200');
  const support = await product('Priority Support', 'addon', '500');
  const kit = await product('Onboarding Kit', 'goods', '1500');
  await query(
    `insert into product_taxes (product_id, tax_id) values ($1, $2), ($3, $2), ($4, $2), ($5, $2), ($6, $7)`,
    [crm.id, gst18.id, hr.id, storage.id, support.id, kit.id, gst5.id],
  );

  const plan = (name, productId, price, period, flags = {}) =>
    one(
      `insert into plans (name, product_id, price, billing_period, interval_count, min_quantity,
                          auto_close, closable, pausable, renewable, available_from, available_to)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning *`,
      [
        name,
        productId,
        price,
        period,
        flags.intervalCount ?? 1,
        flags.minQuantity ?? 1,
        flags.autoClose ?? false,
        flags.closable ?? false,
        flags.pausable ?? false,
        flags.renewable ?? false,
        flags.availableFrom ?? null,
        flags.availableTo ?? null,
      ],
    );
  const crmMonthly = await plan('CRM Monthly', crm.id, '1000', 'monthly', {
    closable: true,
    pausable: true,
    renewable: true,
  });
  const crmYearly = await plan('CRM Yearly', crm.id, '10000', 'yearly', {
    autoClose: true,
    renewable: true,
  });
  const hrWeekly = await plan('HR Weekly', hr.id, '200', 'weekly', { minQuantity: 5 });
  const dailyTrial = await plan('Daily Trial', crm.id, '50', 'daily', { autoClose: true });

  return {
    taxes: { gst18: gst18.id, gst5: gst5.id },
    terms: { net15: net15.id, immediate: immediate.id },
    products: { crm: crm.id, hr: hr.id, storage: storage.id, support: support.id, kit: kit.id },
    plans: { crmMonthly, crmYearly, hrWeekly, dailyTrial },
  };
}

export async function makeCustomer(name = 'Acme Corp', email) {
  return one(`insert into customers (name, email) values ($1, $2) returning *`, [
    name,
    email ?? `${name.toLowerCase().replace(/\W+/g, '.')}.${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.local`,
  ]);
}
