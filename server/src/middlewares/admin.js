import { requireAuth } from './auth.js';
import { serializeAdmin, verifyAdminCredential } from '../utils/adminAuth.js';

const getAdminCredential = (req) => {
  const headerVal = req.get('x-admin-code') || req.headers['x-admin-code'] || req.headers['X-Admin-Code'];
  const bodyVal = req.body && req.body.admin_code;
  const queryVal = req.query && req.query.admin_code;
  return headerVal || bodyVal || queryVal;
};

const applyAdminAccess = (req, credential) => {
  req.isAdmin = true;
  if (credential?.admin) {
    req.admin = serializeAdmin(credential.admin);
  }
};

export const requireAdminOrAuth = async (req, res, next) => {
  try {
    const adminCode = getAdminCredential(req);
    if (adminCode) {
      const credential = await verifyAdminCredential(adminCode);
      if (credential) {
        applyAdminAccess(req, credential);
        return next();
      }
      return res.status(401).json({ message: 'Invalid admin access' });
    }
  } catch (e) {
    // fall through to auth
  }
  return requireAuth(req, res, next);
};

export const requireAdmin = async (req, res, next) => {
  const adminCode = getAdminCredential(req);
  if (adminCode) {
    const credential = await verifyAdminCredential(adminCode);
    if (credential) {
      applyAdminAccess(req, credential);
      return next();
    }
  }

  return res.status(403).json({ message: 'Admin access required' });
};

export const optionalAdmin = async (req, res, next) => {
  const adminCode = getAdminCredential(req);
  if (!adminCode) return next();

  try {
    const credential = await verifyAdminCredential(adminCode);
    if (credential) {
      applyAdminAccess(req, credential);
    }
  } catch {
    // Keep public GET routes public if an optional admin credential is stale.
  }

  return next();
};
