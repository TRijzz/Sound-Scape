import { requireAuth } from './auth.js';

export const requireAdminOrAuth = (req, res, next) => {
  try {
    const headerVal = req.get('x-admin-code') || req.headers['x-admin-code'] || req.headers['X-Admin-Code'];
    const bodyVal = req.body && req.body.admin_code;
    const queryVal = req.query && req.query.admin_code;
    const adminCode = headerVal || bodyVal || queryVal;
    const expected = process.env.ADMIN_ACCESS_CODE;
    if (adminCode) {
      if (!expected || String(adminCode) === String(expected)) {
        return next();
      }
      return res.status(401).json({ message: 'Invalid admin access code' });
    }
  } catch (e) {
    // fall through to auth
  }
  return requireAuth(req, res, next);
};

