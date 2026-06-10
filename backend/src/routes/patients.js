// ============================================
// Patient CRUD routes
// ============================================

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getAllPatients,
  getPatientById,
  createPatientWithAssessment,
  getDashboardStats,
} from '../services/patientService.js';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/patients — list all patients with latest MCDA results.
 */
router.get('/', (req, res) => {
  const patients = getAllPatients();
  res.json({ patients, stats: getDashboardStats(patients) });
});

/**
 * GET /api/patients/:id — single patient with full detail.
 */
router.get('/:id', (req, res) => {
  const patient = getPatientById(parseInt(req.params.id, 10));
  if (!patient) return res.status(404).json({ error: 'Пациент не найден' });
  res.json({ patient });
});

/**
 * POST /api/patients — create patient, run MCDA, return saved record.
 */
router.post('/', (req, res) => {
  const { full_name, iin, birth_date, gender, phone, symptoms, severities, assessment } = req.body;

  if (!full_name || !iin || !birth_date || !gender || !phone || !assessment) {
    return res.status(400).json({ error: 'Заполните все обязательные поля' });
  }

  const patient = createPatientWithAssessment({
    full_name,
    iin,
    birth_date,
    gender,
    phone,
    symptoms: symptoms || [],
    severities: severities || {},
    assessment,
    created_by: req.user.id,
  });

  res.status(201).json({ patient });
});

export default router;
