import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || '587', 10);
const secure = process.env.SMTP_SECURE === 'true'; // true for 465, false for 587
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const fromEmail = process.env.FROM_EMAIL || user || 'no-reply@example.com';

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: user && pass ? { user, pass } : undefined,
  // Ensure TLS negotiation on 587
  requireTLS: !secure,
});

export const sendMail = async ({ to, subject, html }) => {
  return transporter.sendMail({
    from: fromEmail,
    to,
    subject,
    html,
  });
};