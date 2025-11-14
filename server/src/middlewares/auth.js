import jwt from 'jsonwebtoken';

const accessSecret = process.env.JWT_SECRET || 'dev_secret_change_me';
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_change_me';

export const signAccessToken = (payload) => {
  return jwt.sign(payload, accessSecret, { expiresIn: '15m' });
};

export const signRefreshToken = (payload) => {
  return jwt.sign(payload, refreshSecret, { expiresIn: '7d' });
};

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.substring(7) : null;
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    const decoded = jwt.verify(token, accessSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, refreshSecret);
  } catch {
    return null;
  }
};

export const generateTokens = (user) => {
  const payload = { id: user._id, email: user.email };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
};
