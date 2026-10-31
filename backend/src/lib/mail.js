import { env } from '../config/env.js';
import { isMailConfigured, sendMail } from '../config/mailer.js';

// Sends through SMTP when configured; otherwise logs the email and reports { logged: true }.
export async function deliver({ to, subject, text, attachments = [] }) {
  if (!isMailConfigured()) {
    if (env.NODE_ENV !== 'test') {
      console.info(
        `[mail:log] to=${to} subject="${subject}" attachments=${attachments.map((a) => a.filename).join(',') || '-'}\n${text}`,
      );
    }
    return { delivered: false, logged: true };
  }
  const info = await sendMail({ to, subject, text, attachments });
  return { delivered: true, logged: false, messageId: info.messageId };
}

const money = (v) => `INR ${Number(v).toFixed(2)}`;

export function invoiceEmail(invoice, pdf, fileName) {
  const company = invoice.company_snapshot?.name || 'Brightloop';
  return {
    to: invoice.customer_snapshot?.email,
    subject: `${company} invoice ${invoice.number}`,
    text: [
      `Hello ${invoice.customer_snapshot?.name ?? ''},`,
      '',
      `Please find attached invoice ${invoice.number} for ${money(invoice.total)}, due on ${invoice.due_date}.`,
      '',
      `Thank you,`,
      company,
    ].join('\n'),
    attachments: [{ filename: fileName, content: pdf, contentType: 'application/pdf' }],
  };
}

export function reminderEmail(invoice, pdf, fileName) {
  const company = invoice.company_snapshot?.name || 'Brightloop';
  return {
    to: invoice.customer_snapshot?.email,
    subject: `Reminder: invoice ${invoice.number} is overdue`,
    text: [
      `Hello ${invoice.customer_snapshot?.name ?? ''},`,
      '',
      `Invoice ${invoice.number} was due on ${invoice.due_date} and ${money(invoice.amount_due)} is still outstanding ` +
        `(${invoice.days_overdue} days overdue). The invoice is attached.`,
      '',
      'If you have already paid, please ignore this message.',
      '',
      company,
    ].join('\n'),
    attachments: [{ filename: fileName, content: pdf, contentType: 'application/pdf' }],
  };
}
