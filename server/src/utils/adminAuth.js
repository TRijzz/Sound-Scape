import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

const adminSecret = process.env.JWT_SECRET || 'dev_secret_change_me';

export const serializeAdmin = (admin) => ({
  id: admin._id,
  name: admin.name,
  username: admin.username,
  role: admin.role,
  is_active: admin.is_active,
  last_login_at: admin.last_login_at,
});

export const signAdminToken = (admin) => jwt.sign(
  {
    id: admin._id,
    username: admin.username,
    role: admin.role,
    token_type: 'admin',
  },
  adminSecret,
  { expiresIn: '12h' }
);

export const verifyAdminToken = async (token) => {
  try {
    const decoded = jwt.verify(token, adminSecret);
    if (decoded?.token_type !== 'admin' || !decoded.id) return null;
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.is_active) return null;
    return admin;
  } catch {
    return null;
  }
};

export const verifyAdminCredential = async (credential) => {
  const value = String(credential || '').trim();
  if (!value) return null;

  const admin = await verifyAdminToken(value);
  return admin ? { admin } : null;
};
