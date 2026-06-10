// ============================================
// Notification routes for critical patient alerts
// ============================================

import { Router } from 'express';
import db from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { getPatientById } from '../services/patientService.js';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/notifications — unread notifications with patient summary.
 */
router.get('/', (req, res) => {
  const unreadOnly = req.query.unread !== 'false';
  const sql = unreadOnly
    ? 'SELECT * FROM notifications WHERE is_read = 0 ORDER BY created_at DESC'
    : 'SELECT * FROM notifications ORDER BY created_at DESC';

  const rows = db.prepare(sql).all();
  const notifications = rows.map(n => ({
    ...n,
    is_read: Boolean(n.is_read),
    patient: getPatientById(n.patient_id),
  }));

  res.json({ notifications });
});

/**
 * PATCH /api/notifications/read-all — mark all notifications as read.
 */
router.patch('/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE is_read = 0').run();
  res.json({ ok: true });
});

/**
 * PATCH /api/notifications/:id/read — mark a notification as read.
 */
router.patch('/:id/read', (req, res) => {
  const result = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Уведомление не найдено' });
  res.json({ ok: true });
});

export default router;
