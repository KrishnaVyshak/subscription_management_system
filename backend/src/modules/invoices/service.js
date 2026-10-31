import { query, withTransaction } from '../../config/db.js';
import { BusinessRuleError, NotFoundError } from '../../lib/errors.js';
import { deliver, invoiceEmail, reminderEmail } from '../../lib/mail.js';
import { pdfFileName, renderInvoicePdf } from '../../lib/pdf/invoicePdf.js';
import { releaseInvoiceUsages } from '../discounts/engine.js';
import { usagesForInvoice } from '../discounts/service.js';
import { paymentsForInvoice } from '../payments/service.js';
import * as repo from './repo.js';

const db = { query };

export async function list(filters) {
  const { rows, total, status_counts: statusCounts, totals } = await repo.list(db, filters);
  return { rows, total, statusCounts, totals };
}

export function listAll(filters) {
  return repo.listAll(db, filters);
}

// Payments and applied discounts of an invoice.
export async function extrasFor(client, invoiceId) {
  return {
    payments: await paymentsForInvoice(client, invoiceId),
    discounts: await usagesForInvoice(client, invoiceId),
  };
}

// `customerId` scopes the lookup for the portal (other customers' invoices are 404).
export async function getDetail(id, { customerId } = {}) {
  const invoice = await repo.findById(db, id);
  if (!invoice || (customerId && invoice.customer_id !== customerId)) {
    throw new NotFoundError('Invoice not found');
  }
  const [lines, extras] = await Promise.all([repo.linesFor(db, id), extrasFor(db, id)]);
  return { ...invoice, lines, ...extras };
}

const statusError = (invoice, action) =>
  new BusinessRuleError(`A ${invoice.status} invoice cannot be ${action}`, {
    rule: 'INVALID_INVOICE_STATUS',
  });

export async function confirmLocked(client, invoice) {
  if (invoice.status !== 'draft') throw statusError(invoice, 'confirmed');
  const status = Number(invoice.total) === 0 ? 'paid' : 'confirmed';
  await client.query(
    `update invoices set status = $2::invoice_status, confirmed_at = now(),
            paid_at = case when $2::invoice_status = 'paid' then now() else paid_at end
      where id = $1`,
    [invoice.id, status],
  );
}

export async function confirm(id) {
  await withTransaction(async (client) => {
    const invoice = await repo.lock(client, id);
    if (!invoice) throw new NotFoundError('Invoice not found');
    await confirmLocked(client, invoice);
  });
  return getDetail(id);
}

export async function pdf(id, scope = {}) {
  const invoice = await getDetail(id, scope);
  return { buffer: await renderInvoicePdf(invoice, invoice.lines), fileName: pdfFileName(invoice) };
}

// Confirms a draft, renders the PDF, emails it (or logs it without SMTP) and sets sent_at.
export async function send(id) {
  await withTransaction(async (client) => {
    const invoice = await repo.lock(client, id);
    if (!invoice) throw new NotFoundError('Invoice not found');
    if (invoice.status === 'cancelled') throw statusError(invoice, 'sent');
    if (invoice.status === 'draft') await confirmLocked(client, invoice);
  });
  const { buffer, fileName } = await pdf(id);
  const invoice = await getDetail(id);
  if (!invoice.customer_snapshot?.email) {
    throw new BusinessRuleError('The customer has no email address', { rule: 'NO_EMAIL' });
  }
  const email = await deliver(invoiceEmail(invoice, buffer, fileName));
  await query('update invoices set sent_at = now() where id = $1', [id]);
  return { ...(await getDetail(id)), email };
}

export async function sendBulk(ids) {
  const results = [];
  for (const id of ids) {
    try {
      const sent = await send(id);
      results.push({ id, ok: true, number: sent.number, email: sent.email });
    } catch (err) {
      results.push({ id, ok: false, error: { code: err.code ?? 'INTERNAL', message: err.message } });
    }
  }
  return { sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
}

// Overdue invoices only.
export async function remind(id) {
  const invoice = await getDetail(id);
  if (!invoice.is_overdue) {
    throw new BusinessRuleError('Only overdue invoices get reminders', { rule: 'NOT_OVERDUE' });
  }
  if (!invoice.customer_snapshot?.email) {
    throw new BusinessRuleError('The customer has no email address', { rule: 'NO_EMAIL' });
  }
  const buffer = await renderInvoicePdf(invoice, invoice.lines);
  const email = await deliver(reminderEmail(invoice, buffer, pdfFileName(invoice)));
  return { id, number: invoice.number, email };
}

export const CSV_COLUMNS = [
  ['Number', (r) => r.number],
  ['Status', (r) => r.status],
  ['Overdue', (r) => (r.is_overdue ? 'yes' : 'no')],
  ['Days overdue', (r) => r.days_overdue],
  ['Customer', (r) => r.customer_name],
  ['Subscription', (r) => r.subscription_number],
  ['Invoice date', (r) => r.invoice_date],
  ['Due date', (r) => r.due_date],
  ['Period start', (r) => r.period_start],
  ['Period end', (r) => r.period_end],
  ['Subtotal', (r) => r.subtotal],
  ['Discount', (r) => r.discount_total],
  ['Tax', (r) => r.tax_total],
  ['Total', (r) => r.total],
  ['Paid', (r) => r.amount_paid],
  ['Due', (r) => r.amount_due],
];

// Only unpaid invoices can be cancelled. Discount usages are released; the subscription is
// not rewound (the period can be billed again with POST /subscriptions/:id/invoices).
export async function cancel(id) {
  await withTransaction(async (client) => {
    const invoice = await repo.lock(client, id);
    if (!invoice) throw new NotFoundError('Invoice not found');
    if (invoice.status === 'cancelled' || invoice.status === 'paid') {
      throw statusError(invoice, 'cancelled');
    }
    if (Number(invoice.amount_paid) > 0) {
      throw new BusinessRuleError('Remove its payments before cancelling this invoice', {
        rule: 'INVOICE_HAS_PAYMENTS',
      });
    }
    await releaseInvoiceUsages(client, id);
    await client.query(
      `update invoices set status = 'cancelled', cancelled_at = now() where id = $1`,
      [id],
    );
  });
  return getDetail(id);
}
