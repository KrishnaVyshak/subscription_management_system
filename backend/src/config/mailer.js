import nodemailer from 'nodemailer';
import { env } from './env.js';
import { AppError } from '../lib/errors.js';

let transport;

export function isMailConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.MAIL_FROM);
}

function getTransport() {
  if (!transport) {
    if (!isMailConfigured()) {
      throw new AppError(500, 'CONFIG_ERROR', 'SMTP is not configured (see SMTP_* in .env.example)');
    }
    transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      // Port 465 is implicit TLS; 587/2525 upgrade via STARTTLS.
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transport;
}

// Sends one email from MAIL_FROM (falls back to SMTP_FROM). `to` may be an address or "Name <address>".
export async function sendMail({ to, subject, text, html, attachments }) {
  const info = await getTransport().sendMail({
    from: env.MAIL_FROM,
    to,
    subject,
    text,
    html,
    attachments,
  });
  return info;
}
