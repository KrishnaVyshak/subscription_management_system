// Empties the business tables and re-runs the demo seed. Profiles (and their Supabase Auth
// users) and settings are kept; the seed re-links portal customers.
// Usage: npm run reset-demo
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, query } from '../src/config/db.js';

const BUSINESS_TABLES = [
  'payments',
  'discount_usages',
  'invoice_line_taxes',
  'invoice_lines',
  'invoices',
  'billing_runs',
  'subscription_discounts',
  'subscription_status_log',
  'subscription_line_taxes',
  'subscription_lines',
  'subscriptions',
  'template_lines',
  'quotation_templates',
  'discount_products',
  'discounts',
  'plans',
  'product_taxes',
  'product_variant_values',
  'product_variants',
  'attribute_values',
  'product_attributes',
  'products',
  'taxes',
  'payment_terms',
  'customers',
];

try {
  await query(`truncate ${BUSINESS_TABLES.map((t) => `public.${t}`).join(', ')} restart identity cascade`);
  await query('alter sequence public.subscription_number_seq restart');
  await query('alter sequence public.invoice_number_seq restart');
  console.log(`Truncated ${BUSINESS_TABLES.length} business tables.`);
} finally {
  await pool.end();
}

const seed = path.join(path.dirname(fileURLToPath(import.meta.url)), 'seed.js');
const result = spawnSync(process.execPath, [seed], { stdio: 'inherit' });
process.exit(result.status ?? 1);
