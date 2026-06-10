// ============================================
// Patient persistence and MCDA orchestration
// ============================================

import db from '../db/database.js';
import { criteria, avatarColors } from '../data/reference.js';
import { runMCDA } from './mcdaEngine.js';

/**
 * Add icon, colour, and weight metadata to stored criterion scores.
 */
function enrichCriterionScores(rows) {
  return rows.map(row => {
    const c = criteria.find(cr => cr.id === row.criterion_id);
    const score = row.score;
    let color = '#3b82f6';
    if (score >= 75) color = '#ef4444';
    else if (score >= 55) color = '#f97316';
    else if (score >= 35) color = '#eab308';
    else if (score >= 20) color = '#22c55e';

    return {
      criterion_id: row.criterion_id,
      criterion_name: c?.name || '',
      icon: c?.icon || '',
      weight: c?.weight || 0,
      score: row.score,
      weighted_score: row.weighted_score,
      color,
    };
  });
}

/**
 * Load symptom IDs and severity map for a patient.
 */
function getPatientSymptoms(patientId) {
  const rows = db.prepare(
    'SELECT symptom_id, severity FROM patient_symptoms WHERE patient_id = ?'
  ).all(patientId);

  const symptoms = rows.map(r => r.symptom_id);
  const severities = {};
  rows.forEach(r => { severities[r.symptom_id] = r.severity; });
  return { symptoms, severities };
}

/**
 * Fetch the latest assessment for a patient.
 */
function getLatestAssessment(patientId) {
  return db.prepare(
    'SELECT * FROM assessments WHERE patient_id = ? ORDER BY id DESC LIMIT 1'
  ).get(patientId);
}

/**
 * Fetch MCDA result and criterion scores for an assessment.
 */
function getMcdaResult(assessmentId) {
  const result = db.prepare('SELECT * FROM mcda_results WHERE assessment_id = ?').get(assessmentId);
  if (!result) return null;

  const scores = db.prepare(
    'SELECT criterion_id, score, weighted_score FROM criterion_scores WHERE result_id = ?'
  ).all(result.id);

  let recommendation = [];
  try {
    recommendation = result.recommendations ? JSON.parse(result.recommendations) : [];
  } catch {
    recommendation = [];
  }

  return {
    total_score: result.total_score,
    risk_level: result.risk_level,
    possible_diagnosis: result.possible_diagnosis,
    recommendation,
    ai_summary: result.ai_summary,
    criterion_scores: enrichCriterionScores(scores),
    created_at: result.created_at,
  };
}

/**
 * Shape a DB patient row into the API response expected by the frontend.
 */
export function formatPatient(patientRow) {
  const assessment = getLatestAssessment(patientRow.id);
  const { symptoms, severities } = getPatientSymptoms(patientRow.id);
  const mcdaResult = assessment ? getMcdaResult(assessment.id) : null;

  return {
    id: patientRow.id,
    full_name: patientRow.full_name,
    iin: patientRow.iin,
    birth_date: patientRow.birth_date,
    gender: patientRow.gender,
    phone: patientRow.phone,
    color: patientRow.color,
    created_at: patientRow.created_at?.slice(0, 10),
    created_by: patientRow.created_by,
    symptoms,
    severities,
    assessment: assessment ? {
      blood_pressure: assessment.blood_pressure,
      temperature: assessment.temperature,
      pulse: assessment.pulse,
      oxygen: assessment.oxygen,
      complaints: assessment.complaints,
      notes: assessment.notes,
    } : null,
    mcdaResult,
  };
}

/**
 * Create a notification when a patient is in critical or high risk.
 */
function createCriticalNotification(patientId, patientName, mcda) {
  if (mcda.risk_level !== 'Critical' && mcda.risk_level !== 'High') return;

  db.prepare(
    'INSERT INTO notifications (patient_id, type, message) VALUES (?, ?, ?)'
  ).run(
    patientId,
    'critical',
    `${patientName}: ${mcda.possible_diagnosis} (балл ${mcda.total_score})`
  );
}

/**
 * Persist patient, assessment, symptoms, MCDA result, and criterion scores in one transaction.
 */
export function createPatientWithAssessment(data) {
  const createTx = db.transaction(() => {
    const patientResult = db.prepare(`
      INSERT INTO patients (full_name, iin, birth_date, gender, phone, color, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.full_name,
      data.iin,
      data.birth_date,
      data.gender,
      data.phone,
      data.color || avatarColors[0],
      data.created_by
    );

    const patientId = patientResult.lastInsertRowid;

    (data.symptoms || []).forEach(symptomId => {
      db.prepare(
        'INSERT INTO patient_symptoms (patient_id, symptom_id, severity) VALUES (?, ?, ?)'
      ).run(patientId, symptomId, data.severities?.[symptomId] || 5);
    });

    const a = data.assessment;
    const assessmentResult = db.prepare(`
      INSERT INTO assessments (patient_id, blood_pressure, temperature, pulse, oxygen, complaints, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(patientId, a.blood_pressure, a.temperature, a.pulse, a.oxygen, a.complaints || '', a.notes || '');

    const assessmentId = assessmentResult.lastInsertRowid;

    const patientPayload = {
      symptoms: data.symptoms || [],
      severities: data.severities || {},
      assessment: a,
    };
    const mcda = runMCDA(patientPayload);

    const mcdaResult = db.prepare(`
      INSERT INTO mcda_results (patient_id, assessment_id, total_score, risk_level, possible_diagnosis, recommendation, recommendations, ai_summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      patientId,
      assessmentId,
      mcda.total_score,
      mcda.risk_level,
      mcda.possible_diagnosis,
      mcda.recommendation[0]?.text || '',
      JSON.stringify(mcda.recommendation),
      mcda.ai_summary
    );

    const resultId = mcdaResult.lastInsertRowid;
    const insertScore = db.prepare(
      'INSERT INTO criterion_scores (result_id, criterion_id, score, weighted_score) VALUES (?, ?, ?, ?)'
    );
    mcda.criterion_scores.forEach(cs => {
      insertScore.run(resultId, cs.criterion_id, cs.score, cs.weighted_score);
    });

    createCriticalNotification(patientId, data.full_name, mcda);

    return patientId;
  });

  const patientId = createTx();
  return getPatientById(patientId);
}

/**
 * Return all patients with their latest assessment and MCDA result.
 */
export function getAllPatients() {
  const rows = db.prepare('SELECT * FROM patients ORDER BY id ASC').all();
  return rows.map(formatPatient);
}

/**
 * Return a single patient by ID or null if not found.
 */
export function getPatientById(id) {
  const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  if (!row) return null;
  return formatPatient(row);
}

/**
 * Compute dashboard aggregate statistics from patient list.
 */
export function getDashboardStats(patients) {
  let critical = 0;
  let stable = 0;
  let moderate = 0;

  patients.forEach(p => {
    const r = p.mcdaResult?.risk_level;
    if (r === 'Critical' || r === 'High') critical++;
    else if (r === 'Stable' || r === 'Low') stable++;
    else moderate++;
  });

  return { total: patients.length, critical, stable, moderate };
}
