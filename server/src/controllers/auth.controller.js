import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateTokens, verifyRefreshToken } from '../middlewares/auth.js';
import { sendMail } from '../config/email.js';

export const register = async (req, res) => {
  try {
    const { name, email, password, username, avatar_url } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Invalid email format' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already in use' });

    const user = await User.create({ name, email, password, username, avatar_url });
    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // Issue initial 6-digit verification code (for UI)
    const code = (crypto.randomInt(100000, 999999)).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    user.emailVerificationCodeHash = codeHash;
    user.emailVerificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.save();

    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV] Email verification code:', code);
      console.log('[DEV] Verify on frontend:', `${appBaseUrl}/verify-email`);
    }

    try {
      await sendMail({
        to: user.email,
        subject: 'Your verification code',
        html: `
          <p>Hi ${user.name || 'there'},</p>
          <p>Your verification code is: <strong>${code}</strong></p>
          <p>This code expires in 10 minutes.</p>
        `,
      });
    } catch (mailErr) {
      console.warn('Email send failed:', mailErr.message);
    }

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        username: user.username, 
        avatar_url: user.avatar_url,
        isVerified: user.emailVerified
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const signup = register;

export const login = async (req, res) => {
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
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        username: user.username, 
        avatar_url: user.avatar_url,
        isVerified: user.emailVerified
      }
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
      user: { id: user._id, name: user.name, email: user.email, username: user.username, avatar_url: user.avatar_url }
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
    const verifyUrlBackend = `${baseUrl}/api/auth/email/verify?token=${encodeURIComponent(token)}`;
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
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
          <p><a href="${verifyUrlFrontend}">Verify Email (Frontend)</a></p>
          <p>Or GET: ${verifyUrlBackend}</p>
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
    const resetUrlBackend = `${baseUrl}/api/auth/password/reset`;
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    const resetUrlFrontend = `${appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV] Password reset link (frontend):', resetUrlFrontend);
      console.log('[DEV] Password reset link (backend POST):', resetUrlBackend);
    }

    try {
      await sendMail({
        to: user.email,
        subject: 'Reset your password',
        html: `
          <p>Hi ${user.name || 'there'},</p>
          <p>You requested a password reset. This link expires in 1 hour.</p>
          <p><a href="${resetUrlFrontend}">Reset Password (Frontend)</a></p>
          <p>Or POST to: ${resetUrlBackend} with JSON {"token":"${token}","newPassword":"yourNewPassword"}</p>
        `,
      });
    } catch (mailErr) {
      console.warn('Email send failed:', mailErr.message);
    }

    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) return res.status(400).json({ message: 'Missing token or newPassword' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const hash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetTokenHash: hash,
      passwordResetExpires: { $gt: new Date() },
    }).select('+password');

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

// New: resend 6-digit verification code
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.emailVerified) return res.json({ message: 'Email already verified' });

    const code = (crypto.randomInt(100000, 999999)).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    user.emailVerificationCodeHash = codeHash;
    user.emailVerificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV] Email verification code (resend):', code);
      console.log('[DEV] Verify on frontend:', `${appBaseUrl}/verify-email`);
    }

    try {
      await sendMail({
        to: user.email,
        subject: 'Your verification code',
        html: `
          <p>Hi ${user.name || 'there'},</p>
          <p>Your verification code is: <strong>${code}</strong></p>
          <p>This code expires in 10 minutes.</p>
        `,
      });
    } catch (mailErr) {
      console.warn('Email send failed:', mailErr.message);
    }

    res.json({ message: 'Verification code sent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// New: verify 6-digit code
export const verifyEmailCode = async (req, res) => {
  try {
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
    // Also clear token-based fields if any
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
