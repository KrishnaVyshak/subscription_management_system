// Usage: npm run mail:test -w backend -- you@example.com
import { sendMail } from '../config/mailer.js';

const to = process.argv[2];
if (!to) {
  console.error('Usage: npm run mail:test -w backend -- <recipient email>');
  process.exit(1);
}

try {
  const info = await sendMail({
    to,
    subject: 'Hello from Brightloop',
    text: 'This is a test e-mail message.',
  });
  console.log('Message sent: %s', info.messageId);
} catch (err) {
  console.error('Failed to send:', err.message);
  process.exit(1);
}
