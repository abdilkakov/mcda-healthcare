// ============================================
// JWT authentication middleware
// ============================================

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mcda-dev-secret';

/**
 * Verify Bearer token and attach decoded user to the request.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
}

/**
 * Sign a JWT for the authenticated user.
 */
export function signToken(user) {
  return jwt.sign(
    { id: user.id, login: user.login, role: user.role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}
