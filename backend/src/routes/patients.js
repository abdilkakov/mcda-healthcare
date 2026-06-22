// ============================================
// Patient CRUD routes
// ============================================

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getAllPatients,
  getPatientById,
  createPatientWithAssessment,
  getDashboardStats,
  addRecommendation,
  voteRecommendation,
  saveDocument,
  deleteDocument,
  getAllDocuments
} from '../services/patientService.js';
import { parseDocument, matchRecommendations } from '../services/mlService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../data/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${Date.now()}-${originalName}`);
  }
});
const upload = multer({ storage });

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
 * GET /api/patients/documents/all — list all documents.
 */
router.get('/documents/all', (req, res) => {
  try {
    const docs = getAllDocuments();
    res.json({ documents: docs });
  } catch (err) {
    console.error('Error fetching all documents:', err);
    res.status(500).json({ error: 'Ошибка при получении документов' });
  }
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
 * GET /api/patients/:id/ai-recommendations — fetch ML-ranked recommendations for a patient
 */
router.get('/:id/ai-recommendations', async (req, res) => {
  try {
    const patient = getPatientById(parseInt(req.params.id, 10));
    if (!patient) return res.status(404).json({ error: 'Пациент не найден' });

    // 1. Build patient context text
    const diagnosis = patient.mcdaResult?.possible_diagnosis || '';
    const complaints = patient.assessment?.complaints || '';
    const notes = patient.assessment?.notes || '';
    const vitals = `АД: ${patient.assessment?.blood_pressure}, Температура: ${patient.assessment?.temperature}, Пульс: ${patient.assessment?.pulse}, Кислород: ${patient.assessment?.oxygen}`;
    const patientContext = `Диагноз: ${diagnosis}. Жалобы: ${complaints}. ${notes}. Показатели: ${vitals}`;

    // 2. Fetch all Knowledge Base documents
    const allDocs = getAllDocuments().filter(d => d.patient_id === 0);
    
    // 3. Format documents for ML service
    const formattedDocs = allDocs.map(d => ({
      id: d.id,
      filename: d.filename,
      sentences: d.extracted_data?.recommended_sentences || []
    }));

    // 4. Hit Python ML Engine
    const mlResponse = await matchRecommendations(patientContext, formattedDocs);
    
    if (!mlResponse || !mlResponse.recommendations) {
      return res.json({ recommendations: [] });
    }

    res.json({ recommendations: mlResponse.recommendations });
  } catch (err) {
    console.error('Error fetching ML recommendations:', err);
    res.status(500).json({ error: 'Ошибка ML сервиса' });
  }
});

/**
 * POST /api/patients — create patient, run MCDA, return saved record.
 */
router.post('/', async (req, res) => {
  const { full_name, iin, birth_date, gender, phone, symptoms, severities, assessment } = req.body;

  if (!full_name || !iin || !birth_date || !gender || !phone || !assessment) {
    return res.status(400).json({ error: 'Заполните все обязательные поля' });
  }

  try {
    const patient = await createPatientWithAssessment({
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
  } catch (err) {
    console.error('Error creating patient:', err);
    res.status(500).json({ error: 'Ошибка при создании пациента' });
  }
});

/**
 * POST /api/patients/:id/recommendations
 */
router.post('/:id/recommendations', (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Текст рекомендации обязателен' });

  try {
    const recId = addRecommendation(patientId, req.user.id, text);
    res.status(201).json({ success: true, id: recId });
  } catch (err) {
    console.error('Error adding recommendation:', err);
    res.status(500).json({ error: 'Ошибка при добавлении рекомендации' });
  }
});

/**
 * POST /api/patients/:id/recommendations/:recId/vote
 */
router.post('/:id/recommendations/:recId/vote', (req, res) => {
  const recId = parseInt(req.params.recId, 10);
  const { voteValue } = req.body;

  try {
    voteRecommendation(recId, req.user.id, voteValue);
    res.json({ success: true });
  } catch (err) {
    console.error('Error voting:', err);
    res.status(500).json({ error: 'Ошибка при голосовании' });
  }
});

/**
 * POST /api/patients/:id/documents
 */
router.post('/:id/documents', upload.single('file'), async (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  const isProtocol = req.body.is_protocol === 'true' || req.body.is_protocol === true;

  if (!req.file) return res.status(400).json({ error: 'Файл обязателен' });

  let extractedText = null;
  let extractedData = null;
  const filePath = req.file.path;
  const filename = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

  try {
    // Parse ALL uploaded documents with ML service (MarkItDown)
    const fileBuffer = fs.readFileSync(filePath);
    const parseResult = await parseDocument(fileBuffer, filename);
    if (parseResult) {
      if (parseResult.raw_text) extractedText = parseResult.raw_text;
      if (parseResult.extracted_data) extractedData = parseResult.extracted_data;
    }

    const docId = saveDocument(patientId, filename, filePath, isProtocol ? 1 : 0, extractedText, extractedData);
    res.status(201).json({ success: true, id: docId, extractedText, extractedData });
  } catch (err) {
    console.error('Error saving document:', err);
    res.status(500).json({ error: 'Ошибка при сохранении документа' });
  }
});

/**
 * DELETE /api/patients/:id/documents/:docId
 */
router.delete('/:id/documents/:docId', (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  const docId = parseInt(req.params.docId, 10);

  try {
    const success = deleteDocument(docId, patientId);
    if (!success) return res.status(404).json({ error: 'Документ не найден' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: 'Ошибка при удалении документа' });
  }
});

export default router;
