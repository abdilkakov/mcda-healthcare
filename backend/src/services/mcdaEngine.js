// ============================================
// MCDA Engine — Hybrid Rule-Based & ML Scoring
// ============================================

import { criteria, symptoms as symptomList } from '../data/reference.js';

function normBP(bpStr) {
  const [sys] = (bpStr || '120/80').split('/').map(Number);
  if (sys >= 180) return 95;
  if (sys >= 160) return 80;
  if (sys >= 140) return 60;
  if (sys >= 130) return 40;
  if (sys >= 120) return 20;
  return 10;
}

function normTemp(t) {
  if (t >= 40) return 95;
  if (t >= 39) return 75;
  if (t >= 38) return 50;
  if (t >= 37.5) return 30;
  return 10;
}

function normPulse(p) {
  if (p >= 130) return 95;
  if (p >= 110) return 75;
  if (p >= 100) return 55;
  if (p >= 90) return 35;
  return 10;
}

function normOxygen(o) {
  if (o <= 85) return 95;
  if (o <= 90) return 75;
  if (o <= 93) return 50;
  if (o <= 95) return 30;
  return 10;
}

function normSymptoms(patientSymptoms, severities) {
  if (!patientSymptoms || patientSymptoms.length === 0) return 5;
  const avgSev = patientSymptoms.reduce((s, id) => s + (severities[id] || 5), 0) / patientSymptoms.length;
  return Math.min(100, (avgSev / 10) * 100 * (0.5 + patientSymptoms.length * 0.15));
}

function scoreColor(score) {
  if (score >= 75) return '#ef4444';
  if (score >= 55) return '#f97316';
  if (score >= 35) return '#eab308';
  if (score >= 20) return '#22c55e';
  return '#3b82f6';
}

function classifyRisk(score) {
  if (score >= 75) return 'Critical';
  if (score >= 55) return 'High';
  if (score >= 35) return 'Moderate';
  if (score >= 20) return 'Low';
  return 'Stable';
}

export function riskLabel(level) {
  const map = { Critical: 'Критический', High: 'Высокий', Moderate: 'Средний', Low: 'Низкий', Stable: 'Стабильный' };
  return map[level] || level;
}

/**
 * Generates diagnosis using ML primarily, falling back to rule-based.
 */
function generateDiagnosis(patient, risk, mlResults) {
  // ML Override: If RandomForest has high confidence, use it.
  if (mlResults?.diagnosis?.top_diagnoses?.length > 0) {
    const topD = mlResults.diagnosis.top_diagnoses[0];
    if (topD.confidence > 70) {
      return `${topD.diagnosis} (AI Confidence: ${topD.confidence}%)`;
    }
  }

  // Rule-based Fallback
  const symIds = patient.symptoms || [];
  if (symIds.includes(4) && symIds.includes(3)) return 'Подозрение на острый коронарный синдром';
  if (symIds.includes(10) && symIds.includes(12)) return 'Подозрение на эпилептический статус / инсульт';
  if (symIds.includes(1) && symIds.includes(3)) return 'Подозрение на пневмонию тяжёлого течения';
  if (symIds.includes(8) && symIds.includes(6)) return 'Острый гастроэнтерит, требуется обследование';
  if (risk === 'Critical') return 'Неотложное состояние — требуется комплексная диагностика';
  if (risk === 'High') return 'Требуется расширенная диагностика и наблюдение';
  if (risk === 'Moderate') return 'Умеренные нарушения — амбулаторное лечение';
  return 'Состояние стабильное, плановый осмотр';
}

/**
 * Builds recommendations by combining rule-based heuristics with MultiOutputClassifier ML actions.
 */
function generateRecommendations(patient, risk, mlResults) {
  const recs = [];
  
  // 1. Rule-based fundamentals
  if (risk === 'Critical' || risk === 'High') {
    recs.push({ title: '<i class="fa-solid fa-triangle-exclamation"></i> Экстренная помощь', text: 'Немедленная госпитализация в реанимационное отделение. Подготовить оборудование для мониторинга.', priority: 'high' });
    recs.push({ title: '<i class="fa-solid fa-syringe"></i> Медикаментозное вмешательство', text: 'Начать инфузионную терапию. Назначить обезболивание при болевом синдроме.', priority: 'high' });
  }
  if (patient.assessment.oxygen < 92) {
    recs.push({ title: '<i class="fa-solid fa-lungs"></i> Кислородная поддержка', text: `SpO₂ = ${patient.assessment.oxygen}%. Начать подачу кислорода через маску.`, priority: 'high' });
  }
  if (patient.assessment.temperature >= 38.5) {
    recs.push({ title: '<i class="fa-solid fa-thermometer-half"></i> Жаропонижающее', text: `Температура ${patient.assessment.temperature}°C. Назначить парацетамол/ибупрофен.`, priority: 'medium' });
  }
  if (risk === 'Low' || risk === 'Stable') {
    recs.push({ title: '<i class="fa-solid fa-check"></i> Плановое наблюдение', text: 'Состояние стабильное. Продолжить текущую терапию.', priority: 'low' });
  }

  // 2. ML Appended Recommendations
  if (mlResults?.recommendations?.recommended_actions) {
    mlResults.recommendations.recommended_actions.forEach(action => {
      // Prevent duplicates if a rule already covered it
      const exists = recs.some(r => r.text.includes(action) || r.title.includes(action));
      if (!exists && action !== 'None') {
        recs.push({
          title: `<i class="fa-solid fa-robot"></i> AI Предписание: ${action}`,
          text: `ML-модель рекомендовала это действие на основе текущих показателей.`,
          priority: 'medium'
        });
      }
    });
  }

  return recs;
}

/**
 * Combines standard text with SHAP TreeExplainer summaries from Python.
 */
function generateAISummary(patient, score, risk, criterionScores, mlResults) {
  const topCriteria = [...criterionScores].sort((a, b) => b.score - a.score).slice(0, 2);
  const topNames = topCriteria.map(c => c.criterion_name.toLowerCase()).join(' и ');

  let baseSummary = `Комплексный MCDA-анализ завершён. Итоговый балл риска: ${score}/100 (${riskLabel(risk)}). Основные факторы риска: ${topNames}. `;

  // Inject ML SHAP insights if available
  if (mlResults?.triage?.status === 'success') {
    baseSummary += `\n\n[AI SHAP Analysis] ${mlResults.triage.ai_summary}`;
  }
  
  if (mlResults?.diagnosis?.top_diagnoses?.length > 0 && mlResults.diagnosis.top_diagnoses[0].confidence <= 70) {
    const diff = mlResults.diagnosis.top_diagnoses.map(d => `${d.diagnosis} (${d.confidence}%)`).join(', ');
    baseSummary += `\n[AI Differential] Возможные альтернативы: ${diff}.`;
  }

  return baseSummary;
}

/**
 * Run full MCDA analysis on a patient payload, optionally taking mlResults from the Python backend.
 */
export function runMCDA(patient, mlResults = null) {
  const a = patient.assessment;
  if (!a) return null;

  const scores = [
    { criterionId: 1, raw: normBP(a.blood_pressure) },
    { criterionId: 2, raw: normTemp(a.temperature) },
    { criterionId: 3, raw: normPulse(a.pulse) },
    { criterionId: 4, raw: normOxygen(a.oxygen) },
    { criterionId: 5, raw: normSymptoms(patient.symptoms, patient.severities) },
  ];

  let totalScore = 0;
  const criterionScores = scores.map(s => {
    const c = criteria.find(cr => cr.id === s.criterionId);
    const weighted = +(s.raw * c.weight).toFixed(1);
    totalScore += weighted;
    return {
      criterion_id: s.criterionId,
      criterion_name: c.name,
      icon: c.icon,
      weight: c.weight,
      score: +s.raw.toFixed(1),
      weighted_score: weighted,
      color: scoreColor(s.raw),
    };
  });

  totalScore = +totalScore.toFixed(1);
  const riskLevel = classifyRisk(totalScore);
  
  // Pass mlResults into our generators
  const diagnosis = generateDiagnosis(patient, riskLevel, mlResults);
  const recommendation = generateRecommendations(patient, riskLevel, mlResults);
  const aiSummary = generateAISummary(patient, totalScore, riskLevel, criterionScores, mlResults);

  return {
    total_score: totalScore,
    risk_level: riskLevel,
    possible_diagnosis: diagnosis,
    recommendation,
    ai_summary: aiSummary,
    criterion_scores: criterionScores,
    created_at: new Date().toISOString(),
  };
}