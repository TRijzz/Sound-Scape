import User from '../models/User.js';
import Admin from '../models/Admin.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateTokens, verifyRefreshToken } from '../middlewares/auth.js';
import { sendMail } from '../config/email.js';
import { serializeAdmin, signAdminToken, verifyAdminCredential } from '../utils/adminAuth.js';

// Track recent signup attempts
const recentSignups = new Map();
const SIGNUP_RATE_LIMIT = 3; // Max attempts
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

const buildAuthUserPayload = (user) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  username: user.username,
  avatar_url: user.avatar_url,
  isVerified: user.emailVerified,
  emailVerified: user.emailVerified,
  onboarded: Boolean(user.onboarded),
  preferred_genres: Array.isArray(user.preferred_genres) ? user.preferred_genres : [],
  preferred_moods: Array.isArray(user.preferred_moods) ? user.preferred_moods : [],
  preferred_languages: Array.isArray(user.preferred_languages) ? user.preferred_languages : [],
  preferred_tags: Array.isArray(user.preferred_tags) ? user.preferred_tags : []
});

const getAppBaseUrl = (req) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  if (process.env.NODE_ENV === 'production') {
    return (req.get('origin') || process.env.APP_BASE_URL || baseUrl).replace(/\/$/, '');
  }
  return 'http://localhost:3000';
};

const isValidEmail = (value) => /^\S+@\S+\.\S+$/.test(String(value || '').trim());

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const buildVerificationCodeEmail = ({ name, code }) => {
  const safeName = escapeHtml(name || 'there');
  const safeCode = escapeHtml(code || '');
  const text = [
    'Sound Scape',
    '',
    `Welcome, ${name || 'there'}.`,
    `Your verification code is: ${code}`,
    'This code expires in 10 minutes.',
    '',
    'If you did not request this code, you can ignore this email.'
  ].join('\n');

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Sound Scape Verification Code</title>
      </head>
      <body style="margin:0; padding:0; background:#05060a; color:#f8fafc; font-family:Arial, Helvetica, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#05060a; padding:36px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px; border-collapse:separate; overflow:hidden; border:1px solid #1f3c48; border-radius:28px; background:#0b0d14; box-shadow:0 28px 80px rgba(0,0,0,0.45);">
                <tr>
                  <td style="padding:0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f1720;">
                      <tr>
                        <td style="padding:34px 34px 28px; background:#101820;">
                          <div style="font-size:12px; line-height:1; font-weight:800; letter-spacing:7px; text-transform:uppercase; color:#22d3ee;">Sound Scape</div>
                          <h1 style="margin:18px 0 8px; font-size:42px; line-height:1.05; font-weight:900; color:#ffffff;">Welcome aboard.</h1>
                          <p style="margin:0; max-width:520px; font-size:16px; line-height:1.7; color:#cbd5e1;">Hi ${safeName}, your listening profile is almost ready. Enter the system code below to verify your account.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:34px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #164e63; border-radius:22px; background:#070a10;">
                      <tr>
                        <td style="padding:26px 26px 8px;">
                          <div style="font-size:12px; font-weight:800; letter-spacing:4px; text-transform:uppercase; color:#67e8f9;">System Access Code</div>
                          <div style="margin-top:10px; height:3px; width:86px; background:#22d3ee; border-radius:99px;"></div>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:18px 26px 24px;">
                          <div style="display:inline-block; padding:18px 24px; border:1px solid #155e75; border-radius:18px; background:#111827;">
                            <span style="font-family:Consolas, Monaco, 'Courier New', monospace; font-size:44px; line-height:1; letter-spacing:12px; font-weight:900; color:#67e8f9;">${safeCode}</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 26px 26px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #1f2937;">
                            <tr>
                              <td style="padding-top:18px; font-size:14px; line-height:1.7; color:#cbd5e1;">
                                This code expires in <strong style="color:#ffffff;">10 minutes</strong>. Keep it private and only enter it inside Sound Scape.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;">
                      <tr>
                        <td style="padding:16px 18px; border:1px solid #1f2937; border-radius:16px; background:#0f172a; color:#94a3b8; font-size:13px; line-height:1.7;">
                          <strong style="color:#e2e8f0;">Security note:</strong> Sound Scape will never ask for this code outside the app.
                        </td>
                      </tr>
                    </table>

                    <p style="margin:22px 0 0; font-size:12px; line-height:1.6; color:#64748b; text-align:center;">If you did not request this code, you can safely ignore this email.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 34px 30px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="height:1px; background:#1f2937;"></td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top:18px; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#475569;">
                          Curated music console
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return { html, text };
};

const buildPasswordResetEmail = ({ name, resetUrl, isAdmin = false }) => {
  const safeName = escapeHtml(name || 'there');
  const safeResetUrl = escapeHtml(resetUrl || '#');
  const accountType = isAdmin ? 'admin console' : 'listening profile';
  const text = [
    'Sound Scape',
    '',
    `Hi ${name || 'there'},`,
    `We received a request to reset the password for your Sound Scape ${accountType}.`,
    `Reset your password here: ${resetUrl}`,
    'This link expires in 1 hour.',
    '',
    'If you did not request this, you can ignore this email.'
  ].join('\n');

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Reset your Sound Scape password</title>
      </head>
      <body style="margin:0; padding:0; background:#05060a; color:#f8fafc; font-family:Arial, Helvetica, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#05060a; padding:36px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px; border-collapse:separate; overflow:hidden; border:1px solid #1f3c48; border-radius:28px; background:#0b0d14; box-shadow:0 28px 80px rgba(0,0,0,0.45);">
                <tr>
                  <td style="padding:34px 34px 28px; background:#101820;">
                    <div style="font-size:12px; line-height:1; font-weight:800; letter-spacing:7px; text-transform:uppercase; color:#22d3ee;">Sound Scape</div>
                    <h1 style="margin:18px 0 8px; font-size:40px; line-height:1.08; font-weight:900; color:#ffffff;">Password reset request.</h1>
                    <p style="margin:0; max-width:540px; font-size:16px; line-height:1.7; color:#cbd5e1;">Hi ${safeName}, we received a request to reset your Sound Scape ${escapeHtml(accountType)} password.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:34px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #164e63; border-radius:22px; background:#070a10;">
                      <tr>
                        <td style="padding:26px 26px 12px;">
                          <div style="font-size:12px; font-weight:800; letter-spacing:4px; text-transform:uppercase; color:#67e8f9;">Secure Reset Link</div>
                          <div style="margin-top:10px; height:3px; width:86px; background:#22d3ee; border-radius:99px;"></div>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:18px 26px 26px;">
                          <a href="${safeResetUrl}" style="display:inline-block; border-radius:16px; background:#22d3ee; color:#061014; font-size:15px; font-weight:900; letter-spacing:2px; text-transform:uppercase; text-decoration:none; padding:16px 28px;">Reset Password</a>
                          <p style="margin:20px 0 0; font-size:13px; line-height:1.7; color:#94a3b8;">This link expires in <strong style="color:#ffffff;">1 hour</strong>.</p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;">
                      <tr>
                        <td style="padding:16px 18px; border:1px solid #1f2937; border-radius:16px; background:#0f172a; color:#94a3b8; font-size:13px; line-height:1.7;">
                          <strong style="color:#e2e8f0;">Security note:</strong> If you did not request this reset, ignore this email and your password will stay unchanged.
                        </td>
                      </tr>
                    </table>

                    <p style="margin:22px 0 0; font-size:12px; line-height:1.6; color:#64748b; text-align:center;">Button not working? Open this link:<br><span style="color:#94a3b8; word-break:break-all;">${safeResetUrl}</span></p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 34px 30px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr><td style="height:1px; background:#1f2937;"></td></tr>
                      <tr>
                        <td align="center" style="padding-top:18px; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#475569;">Curated music console</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return { html, text };
};

export const register = async (req, res) => {        //Registers user and returns tokens  
  try {
    const { name, email, password, username, avatar_url } = req.body || {};
    
    // Input validation
    const errors = {};
    if (!name) errors.name = 'Name is required';
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors 
      });
    }

    // Rate limiting check
    const now = Date.now();
    const recentSignup = recentSignups.get(email);
    
    if (recentSignup) {
      const { count, timestamp } = recentSignup;
      if (now - timestamp < RATE_LIMIT_WINDOW) {
        if (count >= SIGNUP_RATE_LIMIT) {
          return res.status(423).json({ 
            message: 'Too many signup attempts. Please try again later.',
            retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - timestamp)) / 1000) // in seconds
          });
        }
        recentSignups.set(email, { count: count + 1, timestamp });
      } else {
        recentSignups.set(email, { count: 1, timestamp: now });
      }
    } else {
      recentSignups.set(email, { count: 1, timestamp: now });
    }

    // Check for existing user
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ 
        message: 'Email already in use',
        suggestion: 'Try logging in or use a different email address.'
      });
    }

    const user = await User.create({ name, email, password, username, avatar_url });
    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // Verification code generation for new users
    const code = (crypto.randomInt(100000, 999999)).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    user.emailVerificationCodeHash = codeHash;
    user.emailVerificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes   //Expiry time for the code 
    await user.save();

    // In development, always use localhost:3000 for frontend
    const appBaseUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.APP_BASE_URL || 'http://localhost:3000')
      : 'http://localhost:3000';
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV] Email verification code:', code);
      console.log('[DEV] Verify on frontend:', `${appBaseUrl}/verify-email`);
    }

    // Fire-and-forget the verification email so the signup response
    // returns immediately. SMTP through Gmail can take 2-5s; making
    // the user wait for it just to see "account created" makes signup
    // feel broken on slower hosts (e.g. Render free tier).
    const verificationEmail = buildVerificationCodeEmail({ name: user.name, code });
    sendMail({
      to: user.email,
      subject: 'Sound Scape verification code',
      ...verificationEmail,
    }).catch((mailErr) => {
      console.warn('Email send failed (signup verification):', mailErr.message);
    });

    res.status(201).json({
      accessToken,
      refreshToken,
      user: buildAuthUserPayload(user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const signup = register;

export const login = async (req, res) => {            //Logs user in and returns tokens
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });
    const user = await User.findOne({ email }).select('+password +refreshTokenHash');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: buildAuthUserPayload(user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ message: 'Missing refreshToken' });

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) return res.status(401).json({ message: 'Invalid or expired refresh token' });

    const user = await User.findById(decoded.id).select('+refreshTokenHash');
    if (!user || !user.refreshTokenHash) return res.status(401).json({ message: 'Invalid refresh token' });

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) return res.status(401).json({ message: 'Invalid refresh token' });

    const tokens = generateTokens(user);
    user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await user.save();

    res.json(tokens);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+refreshTokenHash');
    if (user) {
      user.refreshTokenHash = undefined;
      await user.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await user.save();
    res.json({
      accessToken,
      refreshToken,
      user: buildAuthUserPayload(user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// requestEmailVerification() - make async and export, log frontend + backend links, tolerate mail failures
export const requestEmailVerification = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.emailVerified) return res.json({ message: 'Email already verified' });

    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    user.emailVerificationTokenHash = hash;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await user.save();

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    // In development, ALWAYS use localhost:3000 for frontend (ignore APP_BASE_URL if it points to backend)
    let appBaseUrl;
    if (process.env.NODE_ENV === 'production') {
      appBaseUrl = req.get('origin') || process.env.APP_BASE_URL || baseUrl;
    } else {
      // Development: FORCE localhost:3000 for frontend, ignore any APP_BASE_URL that might point to backend
      appBaseUrl = 'http://localhost:3000';
    }
    // Remove trailing slash if present
    appBaseUrl = appBaseUrl.replace(/\/$/, '');
    const verifyUrlBackend = `${baseUrl}/api/auth/email/verify?token=${encodeURIComponent(token)}`;
    const verifyUrlFrontend = `${appBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV] Email verification link (frontend):', verifyUrlFrontend);
      console.log('[DEV] Email verification link (backend):', verifyUrlBackend);
    }

    try {
      await sendMail({
        to: user.email,
        subject: 'Verify your email',
        html: `
          <p>Hi ${user.name || 'there'},</p>
          <p>Please verify your email:</p>
          <p><a href="${verifyUrlFrontend}">Click here to verify your email</a></p>
          <p>This link expires in 24 hours.</p>
        `,
      });
    } catch (mailErr) {
      console.warn('Email send failed:', mailErr.message);
    }

    res.json({ message: 'Verification email sent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query || {};
    if (!token) return res.status(400).json({ message: 'Missing token' });

    const hash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationTokenHash: hash,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.emailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// forgotPassword() - make async and export, fix resetUrlFrontend, log links, tolerate mail failures
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    user.passwordResetTokenHash = hash;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await user.save();

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    // In development, ALWAYS use localhost:3000 for frontend (ignore APP_BASE_URL if it points to backend)
    let appBaseUrl;
    if (process.env.NODE_ENV === 'production') {
      appBaseUrl = req.get('origin') || process.env.APP_BASE_URL || baseUrl;
    } else {
      // Development: FORCE localhost:3000 for frontend, ignore any APP_BASE_URL that might point to backend
      appBaseUrl = 'http://localhost:3000';
    }
    // Remove trailing slash if present
    appBaseUrl = appBaseUrl.replace(/\/$/, '');
    const resetUrlBackend = `${baseUrl}/api/auth/password/reset`;
    const resetUrlFrontend = `${appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV] NODE_ENV:', process.env.NODE_ENV);
      console.log('[DEV] APP_BASE_URL env:', process.env.APP_BASE_URL);
      console.log('[DEV] Password reset link (frontend):', resetUrlFrontend);
      console.log('[DEV] Password reset link (backend POST):', resetUrlBackend);
    }

    try {
      const resetEmail = buildPasswordResetEmail({ name: user.name, resetUrl: resetUrlFrontend });
      await sendMail({
        to: user.email,
        subject: 'Reset your Sound Scape password',
        ...resetEmail,
      });
    } catch (mailErr) {
      console.warn('Email send failed:', mailErr.message);
    }

    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const resetPassword = async (req, res) => {      //Reset Password
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) return res.status(400).json({ message: 'Missing token or newPassword' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const hash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetTokenHash: hash,
      passwordResetExpires: { $gt: new Date() },
    }).select('+password +passwordResetTokenHash +passwordResetExpires');

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.password = newPassword; // hashed by pre-save hook
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// In-memory rate-limit maps for change-password flow
const recentPasswordChangeInits = new Map();
const recentPasswordChanges = new Map();
const CHANGE_PASSWORD_LIMIT = 5;          // password attempts
const CHANGE_PASSWORD_WINDOW = 15 * 60 * 1000;  // 15 minutes
const OTP_INIT_LIMIT = 4;                 // OTP send requests
const OTP_INIT_WINDOW = 10 * 60 * 1000;   // 10 minutes
const OTP_EXPIRY_MS = 10 * 60 * 1000;     // OTP lifetime: 10 minutes
const OTP_MAX_ATTEMPTS = 5;               // verify attempts before invalidating OTP

const buildPasswordChangeOtpEmail = ({ name, code }) => {
  const safeName = escapeHtml(name || 'there');
  const safeCode = escapeHtml(code || '');
  const text = [
    'Sound Scape',
    '',
    `Hi ${name || 'there'},`,
    '',
    `Your password change verification code is: ${code}`,
    'This code expires in 10 minutes.',
    '',
    'If you did not request a password change, you can ignore this email and your password will remain unchanged.'
  ].join('\n');

  const html = `
    <!doctype html>
    <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Password change verification</title></head>
      <body style="margin:0;padding:0;background:#05060a;color:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#05060a;padding:36px 12px;">
          <tr><td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border:1px solid #1f3c48;border-radius:24px;background:#0b0d14;overflow:hidden;">
              <tr><td style="padding:34px 34px 24px;background:#0f1720;">
                <div style="font-size:12px;font-weight:800;letter-spacing:7px;text-transform:uppercase;color:#22d3ee;">Sound Scape</div>
                <h1 style="margin:14px 0 8px;font-size:30px;font-weight:900;color:#fff;">Confirm password change</h1>
                <p style="margin:0;color:#cbd5e1;font-size:15px;line-height:1.7;">Hi ${safeName}, you (or someone using your account) just requested to change your password. Enter the code below in Sound Scape to continue.</p>
              </td></tr>
              <tr><td style="padding:24px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #164e63;border-radius:18px;background:#070a10;">
                  <tr><td style="padding:18px 26px 8px;">
                    <div style="font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#67e8f9;">Verification code</div>
                    <div style="margin-top:6px;height:3px;width:80px;background:#22d3ee;border-radius:99px;"></div>
                  </td></tr>
                  <tr><td align="center" style="padding:14px 26px 22px;">
                    <div style="display:inline-block;padding:18px 24px;border:1px solid #155e75;border-radius:16px;background:#111827;">
                      <span style="font-family:Consolas,Monaco,'Courier New',monospace;font-size:42px;line-height:1;letter-spacing:12px;font-weight:900;color:#67e8f9;">${safeCode}</span>
                    </div>
                  </td></tr>
                  <tr><td style="padding:0 26px 22px;font-size:14px;line-height:1.7;color:#cbd5e1;">
                    This code expires in <strong style="color:#fff;">10 minutes</strong>. Don't share it with anyone.
                  </td></tr>
                </table>
              </td></tr>
              <tr><td style="padding:0 34px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr><td style="padding:14px 18px;border:1px solid #1f2937;border-radius:14px;background:#0f172a;color:#94a3b8;font-size:13px;line-height:1.7;">
                    <strong style="color:#e2e8f0;">Didn't request this?</strong> You can safely ignore this email — no changes will be made to your account unless this code is entered.
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>
  `;
  return { text, html };
};

const buildPasswordChangedEmail = ({ name, resetUrl }) => {
  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(resetUrl || '');
  const when = new Date().toUTCString();
  const text = [
    'Sound Scape',
    '',
    `Hi ${name || 'there'},`,
    '',
    'Your Sound Scape account password was just changed.',
    `When: ${when}`,
    '',
    'If this was you, no further action is needed.',
    '',
    'If you did NOT change your password, secure your account immediately by clicking the link below to reset it:',
    resetUrl || '',
    '',
    'This recovery link expires in 1 hour.'
  ].join('\n');

  const html = `
    <!doctype html>
    <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Password changed</title></head>
      <body style="margin:0;padding:0;background:#05060a;color:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#05060a;padding:36px 12px;">
          <tr><td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border:1px solid #1f3c48;border-radius:24px;background:#0b0d14;overflow:hidden;">
              <tr><td style="padding:34px 34px 24px;background:#0f1720;">
                <div style="font-size:12px;font-weight:800;letter-spacing:7px;text-transform:uppercase;color:#22d3ee;">Sound Scape</div>
                <h1 style="margin:14px 0 8px;font-size:30px;font-weight:900;color:#fff;">Your password was changed</h1>
                <p style="margin:0;color:#cbd5e1;font-size:15px;line-height:1.7;">Hi ${safeName}, this is a confirmation that the password for your Sound Scape account was successfully updated.</p>
              </td></tr>
              <tr><td style="padding:24px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #164e63;border-radius:18px;background:#070a10;">
                  <tr><td style="padding:18px 22px;">
                    <div style="font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#67e8f9;">Event time</div>
                    <div style="margin-top:6px;font-size:16px;color:#ffffff;font-weight:600;">${when}</div>
                  </td></tr>
                </table>
              </td></tr>

              <tr><td style="padding:8px 34px 0;">
                <p style="margin:0 0 14px;color:#cbd5e1;font-size:14px;line-height:1.7;">
                  If this was you, you're all set — no further action is needed.
                </p>
              </td></tr>

              <tr><td style="padding:14px 34px 8px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #7f1d1d;border-radius:18px;background:linear-gradient(180deg,#1f0a0a,#0a0708);">
                  <tr><td style="padding:22px 22px 8px;">
                    <div style="font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#fca5a5;">Wasn't you?</div>
                    <h2 style="margin:8px 0 4px;font-size:20px;font-weight:900;color:#ffffff;">Secure your account now</h2>
                    <p style="margin:0;color:#fecaca;font-size:14px;line-height:1.7;">
                      If you did <strong style="color:#fff;">not</strong> change your password, your account may have been compromised. Click the button below to reset your password and lock out anyone else.
                    </p>
                  </td></tr>
                  <tr><td align="center" style="padding:18px 22px 24px;">
                    <a href="${safeUrl}" style="display:inline-block;padding:14px 28px;border-radius:14px;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:900;letter-spacing:1px;font-size:14px;text-transform:uppercase;box-shadow:0 14px 30px rgba(220,38,38,0.45);">Reset password & secure account</a>
                    <p style="margin:14px 0 0;font-size:12px;color:#fecaca;line-height:1.6;">Or paste this URL into your browser:<br>
                      <span style="color:#fef2f2;word-break:break-all;">${safeUrl}</span>
                    </p>
                  </td></tr>
                </table>
                <p style="margin:14px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
                  This recovery link expires in <strong style="color:#cbd5e1;">1 hour</strong>. After that you can request a fresh reset at any time from the sign-in page.
                </p>
              </td></tr>

              <tr><td style="padding:18px 34px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr><td style="padding:14px 18px;border:1px solid #1f2937;border-radius:14px;background:#0f172a;color:#94a3b8;font-size:13px;line-height:1.7;">
                    <strong style="color:#e2e8f0;">Security note:</strong> Sound Scape will never ask for your password by email. We sign you out of other sessions automatically after a password change.
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>
  `;
  return { text, html };
};

const enforceRateLimit = (store, key, limit, windowMs) => {
  const now = Date.now();
  const bucket = store.get(key) || { count: 0, firstAttempt: now };
  if (now - bucket.firstAttempt > windowMs) {
    bucket.count = 0;
    bucket.firstAttempt = now;
  }
  bucket.count += 1;
  store.set(key, bucket);
  return bucket.count <= limit;
};

// Step 1: Initiate change. Verify current password, generate OTP, send email.
export const initChangePassword = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { currentPassword } = req.body || {};
    if (!currentPassword) {
      return res.status(400).json({ message: 'Current password is required' });
    }

    const ipKey = (req.ip || 'unknown').toString();
    const initKey = `init:${String(userId)}:${ipKey}`;
    if (!enforceRateLimit(recentPasswordChangeInits, initKey, OTP_INIT_LIMIT, OTP_INIT_WINDOW)) {
      return res.status(429).json({ message: 'Too many code requests. Try again later.' });
    }

    const user = await User.findById(userId).select('+password +passwordChangeOtpHash +passwordChangeOtpExpires +passwordChangeOtpAttempts');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.password) {
      return res.status(400).json({ message: 'No password set on this account. Use password reset to create one.' });
    }

    const ok = await user.comparePassword(currentPassword);
    if (!ok) return res.status(401).json({ message: 'Current password is incorrect' });

    const code = String(crypto.randomInt(100000, 999999));
    user.passwordChangeOtpHash = crypto.createHash('sha256').update(code).digest('hex');
    user.passwordChangeOtpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    user.passwordChangeOtpAttempts = 0;
    await user.save();

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV] Password change OTP for', user.email, ':', code);
    }

    try {
      const mail = buildPasswordChangeOtpEmail({ name: user.name, code });
      await sendMail({
        to: user.email,
        subject: 'Sound Scape - Confirm your password change',
        text: mail.text,
        html: mail.html
      });
    } catch (mailErr) {
      console.warn('Password-change OTP email failed:', mailErr.message);
      // We still return success so attackers can't probe whether email worked.
    }

    // Hint at where the code was sent without leaking the full address.
    const maskedEmail = (() => {
      const [local, domain] = String(user.email || '').split('@');
      if (!domain) return null;
      const masked = local.length <= 2 ? `${local[0] || ''}*` : `${local.slice(0, 2)}${'*'.repeat(Math.max(1, local.length - 2))}`;
      return `${masked}@${domain}`;
    })();

    res.json({
      message: 'Verification code sent',
      maskedEmail,
      expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000)
    });
  } catch (err) {
    console.error('initChangePassword error:', err);
    res.status(500).json({ message: err.message || 'Failed to send verification code' });
  }
};

// Step 2: Complete the change with OTP + new password.
export const changePassword = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { otp, newPassword } = req.body || {};
    if (!otp || !newPassword) {
      return res.status(400).json({ message: 'Verification code and new password are required' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    // Strength check: ≥ 3 of [lowercase, uppercase, digit, symbol]
    const passedBuckets = [
      /[a-z]/.test(newPassword),
      /[A-Z]/.test(newPassword),
      /\d/.test(newPassword),
      /[^A-Za-z0-9]/.test(newPassword)
    ].filter(Boolean).length;
    if (passedBuckets < 3) {
      return res.status(400).json({ message: 'Password is too weak. Mix uppercase, lowercase, numbers, and symbols.' });
    }

    const ipKey = (req.ip || 'unknown').toString();
    const completeKey = `complete:${String(userId)}:${ipKey}`;
    if (!enforceRateLimit(recentPasswordChanges, completeKey, CHANGE_PASSWORD_LIMIT, CHANGE_PASSWORD_WINDOW)) {
      return res.status(429).json({ message: 'Too many attempts. Try again later.' });
    }

    const user = await User.findById(userId).select('+password +refreshTokenHash +passwordChangeOtpHash +passwordChangeOtpExpires +passwordChangeOtpAttempts');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.passwordChangeOtpHash || !user.passwordChangeOtpExpires) {
      return res.status(400).json({ message: 'No active verification code. Restart the change-password flow.' });
    }
    if (user.passwordChangeOtpExpires.getTime() < Date.now()) {
      user.passwordChangeOtpHash = undefined;
      user.passwordChangeOtpExpires = undefined;
      user.passwordChangeOtpAttempts = 0;
      await user.save();
      return res.status(400).json({ message: 'Verification code expired. Request a new one.' });
    }

    if ((user.passwordChangeOtpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
      user.passwordChangeOtpHash = undefined;
      user.passwordChangeOtpExpires = undefined;
      user.passwordChangeOtpAttempts = 0;
      await user.save();
      return res.status(400).json({ message: 'Too many incorrect codes. Restart the change-password flow.' });
    }

    const submittedHash = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
    if (submittedHash !== user.passwordChangeOtpHash) {
      user.passwordChangeOtpAttempts = (user.passwordChangeOtpAttempts || 0) + 1;
      await user.save();
      return res.status(401).json({ message: 'Incorrect verification code' });
    }

    // Disallow reusing the current password
    const samePassword = await user.comparePassword(newPassword);
    if (samePassword) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    // Update password and revoke other sessions
    user.password = newPassword;       // hashed by pre-save hook
    user.refreshTokenHash = undefined; // sign out other devices
    user.passwordChangeOtpHash = undefined;
    user.passwordChangeOtpExpires = undefined;
    user.passwordChangeOtpAttempts = 0;

    // Generate a one-time reset token for the "wasn't me" link in the success email
    const resetTokenPlain = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = crypto.createHash('sha256').update(resetTokenPlain).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Reset rate-limit buckets on success
    recentPasswordChanges.delete(completeKey);
    recentPasswordChangeInits.delete(`init:${String(userId)}:${ipKey}`);

    const appBaseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${appBaseUrl.replace(/\/$/, '')}/reset-password?token=${resetTokenPlain}`;

    // Send confirmation email (failure tolerant)
    try {
      const mail = buildPasswordChangedEmail({ name: user.name, resetUrl });
      await sendMail({
        to: user.email,
        subject: 'Your Sound Scape password was changed',
        text: mail.text,
        html: mail.html
      });
    } catch (mailErr) {
      console.warn('Password-change success email failed:', mailErr.message);
    }

    res.json({
      message: 'Password updated successfully',
      sessionsRevoked: true
    });
  } catch (err) {
    console.error('changePassword error:', err);
    res.status(500).json({ message: err.message || 'Failed to change password' });
  }
};

// New: resend 6-digit verification code
export const resendVerification = async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: 'Email required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.emailVerified) return res.json({ message: 'Email already verified' });

  const code = (crypto.randomInt(100000, 999999)).toString();
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  user.emailVerificationCodeHash = codeHash;
  user.emailVerificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEV] Email verification code (resend):', code);
  }

  // Fire-and-forget so the endpoint returns immediately. Hosts that
  // block outbound SMTP make awaited sends hang for 2 minutes.
  const verificationEmail = buildVerificationCodeEmail({ name: user.name, code });
  sendMail({
    to: user.email,
    subject: 'Sound Scape verification code',
    ...verificationEmail,
  }).catch((mailErr) => {
    console.warn('Email send failed (resend verification):', mailErr.message);
  });

  res.json({ message: 'Verification code sent' });
}

// Verify Email Code
export const verifyEmailCode = async (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ message: 'Email and code required' });
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ message: 'Invalid code format' });

  const user = await User.findOne({ email }).select('+emailVerificationCodeHash +emailVerificationCodeExpires');
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (!user.emailVerificationCodeHash || !user.emailVerificationCodeExpires) {
    return res.status(400).json({ message: 'No active verification code' });
  }
  if (user.emailVerificationCodeExpires <= new Date()) {
    return res.status(400).json({ message: 'Verification code expired' });
  }

  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  if (codeHash !== user.emailVerificationCodeHash) {
    return res.status(400).json({ message: 'Invalid verification code' });
  }

  user.emailVerified = true;
  user.emailVerificationCodeHash = undefined;
  user.emailVerificationCodeExpires = undefined;
  user.emailVerificationTokenHash = undefined;
  // Generate tokens for the user
  const { accessToken, refreshToken } = await generateTokens(user);
  
  // Update user's refresh token in the database
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  user.emailVerificationExpires = undefined;
  await user.save();

  // Return success response with tokens and user info
  res.json({ 
    success: true,
    message: 'Email verified successfully',
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      avatar_url: user.avatar_url,
      isVerified: true
    }
  });
}

export const registerAdmin = async (req, res) => {
  try {
    const { username, password, email } = req.body || {};
    const errors = {};
    if (!username?.trim()) errors.username = 'Username is required';
    if (!password || password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (!email?.trim()) {
      errors.email = 'Recovery email is required';
    } else if (!isValidEmail(email)) {
      errors.email = 'Valid recovery email required';
    }

    if (Object.keys(errors).length) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const adminCount = await Admin.countDocuments();

    const normalizedUsername = username.trim().toLowerCase();
    const exists = await Admin.findOne({ username: normalizedUsername });
    if (exists) return res.status(409).json({ message: 'Admin username already exists' });

    const normalizedEmail = String(email).trim().toLowerCase();

    const emailExists = await Admin.findOne({ email: normalizedEmail });
    if (emailExists) return res.status(409).json({ message: 'Admin recovery email already exists' });

    const admin = await Admin.create({
      name: username.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      role: adminCount === 0 ? 'superadmin' : 'admin',
    });

    const adminToken = signAdminToken(admin);
    admin.last_login_at = new Date();
    await admin.save();

    return res.status(201).json({
      success: true,
      adminToken,
      admin: serializeAdmin(admin),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create admin' });
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ message: 'Username/email and password are required' });

    const credential = String(username).trim().toLowerCase();
    const admin = await Admin.findOne({
      $or: [
        { username: credential },
        { email: credential },
      ],
    }).select('+password');
    if (!admin || !admin.is_active) return res.status(401).json({ message: 'Invalid admin credentials' });

    const ok = await admin.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid admin credentials' });

    admin.last_login_at = new Date();
    await admin.save();

    return res.json({
      success: true,
      adminToken: signAdminToken(admin),
      admin: serializeAdmin(admin),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Admin login failed' });
  }
};

export const forgotAdminPassword = async (req, res) => {
  try {
    const { identifier } = req.body || {};
    const normalizedIdentifier = String(identifier || '').trim().toLowerCase();
    if (!normalizedIdentifier) {
      return res.status(400).json({ message: 'Admin username or recovery email is required' });
    }

    const admin = await Admin.findOne({
      $or: [
        { username: normalizedIdentifier },
        { email: normalizedIdentifier },
      ],
    });

    const genericMessage = 'If an admin account matches, reset instructions have been sent to its recovery email.';
    if (!admin || !admin.is_active) {
      return res.json({ message: genericMessage });
    }

    const canSendEmail = isValidEmail(admin.email) && !admin.email.endsWith('@admin.local');
    if (!canSendEmail) {
      return res.status(400).json({ message: 'No recovery email is configured for this admin account.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    admin.passwordResetTokenHash = hash;
    admin.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await admin.save();

    const resetUrlFrontend = `${getAppBaseUrl(req)}/admin/reset-password?token=${encodeURIComponent(token)}`;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV] Admin password reset link:', resetUrlFrontend);
    }

    try {
      const resetEmail = buildPasswordResetEmail({ name: admin.name || admin.username, resetUrl: resetUrlFrontend, isAdmin: true });
      await sendMail({
        to: admin.email,
        subject: 'Reset your Sound Scape admin password',
        ...resetEmail,
      });
    } catch (mailErr) {
      console.warn('Admin password reset email failed:', mailErr.message);
    }

    return res.json({ message: genericMessage });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to request admin password reset' });
  }
};

export const resetAdminPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) return res.status(400).json({ message: 'Missing token or newPassword' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const admin = await Admin.findOne({
      passwordResetTokenHash: hash,
      passwordResetExpires: { $gt: new Date() },
    }).select('+password +passwordResetTokenHash +passwordResetExpires');

    if (!admin || !admin.is_active) return res.status(400).json({ message: 'Invalid or expired token' });

    admin.password = newPassword;
    admin.passwordResetTokenHash = undefined;
    admin.passwordResetExpires = undefined;
    await admin.save();

    return res.json({ message: 'Admin password reset successful' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to reset admin password' });
  }
};

// Admin access verification
export const verifyAdminAccess = async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ message: 'Admin access token required' });

    const credential = await verifyAdminCredential(code);
    if (!credential) {
      return res.status(401).json({ message: 'Invalid admin access' });
    }

    return res.json({
      success: true,
      admin: serializeAdmin(credential.admin),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Verification failed' });
  }
};
