// ============================================
// Authentication routes
// ============================================

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/database.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/login — verify credentials and return JWT.
 */
router.post('/login', (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'Логин и пароль обязательны' });
  }

  const user = db.prepare(
    'SELECT id, full_name, email, login, password_hash, role FROM users WHERE login = ?'
  ).get(login.trim());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const token = signToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      login: user.login,
      role: user.role,
    },
  });
});

/**
 * GET /api/auth/me — return the currently authenticated user.
 */
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, full_name, email, login, role FROM users WHERE id = ?'
  ).get(req.user.id);

  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({ user });
});

export default router;
