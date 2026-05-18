import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Check if required environment variables are set
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error('SMTP_USER and SMTP_PASS must be set in the environment variables');
  console.error('Checked .env at:', envPath);
  process.exit(1);
}

const user = process.env.SMTP_USER;
const pass = (process.env.SMTP_PASS || '').trim(); // Trim any whitespace from the password
const fromEmail = process.env.FROM_EMAIL || user;

console.log('SMTP Configuration:', {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  user: user ? '***' : 'NOT SET',
  pass: pass ? '***' : 'NOT SET',
  fromEmail: fromEmail
});

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: user,
    pass: pass
  },
  tls: {
    // Force IPv4 instead of IPv6 to avoid connection issues
    rejectUnauthorized: false
  }
});

// Verify connection configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server is ready to take our messages');
  }
});

export const sendMail = async ({ to, subject, html, text }) => {
  return transporter.sendMail({
    from: fromEmail,
    to,
    subject,
    text,
    html,
  });
};
