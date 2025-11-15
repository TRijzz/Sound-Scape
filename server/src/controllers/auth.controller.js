import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateTokens, verifyRefreshToken } from '../middlewares/auth.js';
import { sendMail } from '../config/email.js';

// Track recent signup attempts
const recentSignups = new Map();
const SIGNUP_RATE_LIMIT = 3; // Max attempts
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

export const register = async (req, res) => {
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

    // Issue initial 6-digit verification code for UI flow
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
    const appBaseUrl = req.get('origin') || process.env.APP_BASE_URL || 'http://localhost:3000';
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
    const appBaseUrl = req.get('origin') || process.env.APP_BASE_URL || 'http://localhost:3000';
    const resetUrlBackend = `${baseUrl}/api/auth/password/reset`;
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
          <p><a href="${resetUrlFrontend}">Click here to reset your password</a></p>
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

  try {
    await sendMail({
      to: user.email,
      subject: 'Your verification code',
      html: `<p>Your verification code is: <strong>${code}</strong></p>`,
    });
  } catch (mailErr) {
    console.warn('Email send failed:', mailErr.message);
  }

  res.json({ message: 'Verification code sent' });
}

// New: verify 6-digit code
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
