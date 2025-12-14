import { Router } from 'express';
import passport from 'passport';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { body } from 'express-validator';
import { register, signup, login, refresh, googleCallback, verifyAdminAccess } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requestEmailVerification, verifyEmail, forgotPassword, resetPassword, resendVerification, verifyEmailCode } from '../controllers/auth.controller.js';

const router = Router();

const isProd = process.env.NODE_ENV === 'production';
const loginLimiter = rateLimit({
  windowMs: isProd ? 15 * 60 * 1000 : 60 * 1000,
  max: isProd ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req)}:${req.body?.email || ''}`,
  message: {
    message: 'Too many login attempts. Please wait and try again.'
  },
});

// Register (alias for /register and /signup)
router.post(
  '/register',
  loginLimiter,
  body('name').trim().isLength({ min: 1 }).withMessage('Name required'),
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 chars'),
  register
);

router.post('/signup', loginLimiter, register);

// Login
router.post(
  '/login',
  loginLimiter,
  body('email').trim().isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  login
);

// Refresh token
router.post('/refresh', refresh);

// Google OAuth 2.0
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), googleCallback);

// Logout (protected)
router.post('/logout', requireAuth, (req, res) => {
  res.status(200).json({ success: true });
});

// Email verification (6-digit code to match frontend)
router.post('/verify-email', verifyEmailCode);
router.post('/resend-verification', resendVerification);

// Legacy email verification (link-based, kept for backward compatibility)
router.post('/email/request-verification', requestEmailVerification);
router.get('/email/verify', verifyEmail);
router.post('/password/forgot', forgotPassword);
router.post('/password/reset', resetPassword);

// Admin access verification (requires login)
router.post('/admin/verify', verifyAdminAccess);

export default router;
