import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

/**
 * Email is sent via one of two providers, chosen based on env vars:
 *
 *  - Resend (HTTP API) — used on Render and any host that blocks outbound SMTP.
 *    Set RESEND_API_KEY to enable. Free tier: 3000 emails/month.
 *
 *  - Nodemailer + Gmail SMTP — used for local development. Set SMTP_USER and
 *    SMTP_PASS to enable. Does NOT work on Render (port 587 is blocked).
 *
 * If both are configured, Resend wins.
 */

const resendApiKey = process.env.RESEND_API_KEY;
const smtpUser = process.env.SMTP_USER;
const smtpPass = (process.env.SMTP_PASS || '').trim();
const fromEmail = process.env.FROM_EMAIL || smtpUser || 'onboarding@resend.dev';

const useResend = Boolean(resendApiKey);
const useSmtp = !useResend && Boolean(smtpUser && smtpPass);

if (!useResend && !useSmtp) {
  console.error('No email provider configured. Set RESEND_API_KEY (recommended) or SMTP_USER/SMTP_PASS.');
  process.exit(1);
}

let resend = null;
let transporter = null;

if (useResend) {
  resend = new Resend(resendApiKey);
  console.log('Email provider: Resend (HTTP API)');
  console.log('  from:', fromEmail);
} else {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: false }
  });

  console.log('Email provider: SMTP (Gmail)');
  console.log('  user:', smtpUser ? '***' : 'NOT SET');
  console.log('  from:', fromEmail);

  transporter.verify((error) => {
    if (error) {
      console.error('SMTP Connection Error:', error.message);
    } else {
      console.log('SMTP Server is ready to take our messages');
    }
  });
}

export const sendMail = async ({ to, subject, html, text }) => {
  if (useResend) {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html,
    });
    if (error) {
      // Surface a real Error so callers' .catch() sees a message string
      throw new Error(error.message || JSON.stringify(error));
    }
    return data;
  }
  return transporter.sendMail({ from: fromEmail, to, subject, text, html });
};
