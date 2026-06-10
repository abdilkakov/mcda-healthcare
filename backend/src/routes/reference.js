// ============================================
// Reference data routes (symptoms, criteria)
// ============================================

import { Router } from 'express';
import db from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/symptoms — symptom catalogue for the patient form.
 */
router.get('/symptoms', (req, res) => {
  const symptoms = db.prepare('SELECT id, name, description FROM symptoms ORDER BY id').all();
  res.json({ symptoms });
});

/**
 * GET /api/criteria — MCDA criteria with weights.
 */
router.get('/criteria', (req, res) => {
  const criteria = db.prepare('SELECT id, name, description, weight, icon FROM criteria ORDER BY id').all();
  res.json({ criteria });
});

export default router;
