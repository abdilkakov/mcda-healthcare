// ============================================
// MCDA Engine — Mock Weighted Sum Scoring
// ============================================

import { criteria, symptoms as symptomList } from '../data/mockData.js';

/**
 * Normalise vital sign to 0-100 risk score (higher = worse)
 */
function normBP(bpStr) {
    const [sys] = bpStr.split('/').map(Number);
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

/**
 * Run MCDA analysis on a patient
 */
export function runMCDA(patient) {
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
    const diagnosis = generateDiagnosis(patient, totalScore, riskLevel);
    const recommendation = generateRecommendations(patient, totalScore, riskLevel);
    const aiSummary = generateAISummary(patient, totalScore, riskLevel, criterionScores);

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

function classifyRisk(score) {
    if (score >= 75) return 'Critical';
    if (score >= 55) return 'High';
    if (score >= 35) return 'Moderate';
    if (score >= 20) return 'Low';
    return 'Stable';
}

function scoreColor(score) {
    if (score >= 75) return '#ef4444';
    if (score >= 55) return '#f97316';
    if (score >= 35) return '#eab308';
    if (score >= 20) return '#22c55e';
    return '#3b82f6';
}

export function riskBadgeClass(level) {
    const map = { Critical: 'badge-critical', High: 'badge-high', Moderate: 'badge-moderate', Low: 'badge-low', Stable: 'badge-stable' };
    return map[level] || 'badge-stable';
}

export function riskLabel(level) {
    const map = { Critical: 'Критический', High: 'Высокий', Moderate: 'Средний', Low: 'Низкий', Stable: 'Стабильный' };
    return map[level] || level;
}

function generateDiagnosis(patient, score, risk) {
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

function generateRecommendations(patient, score, risk) {
    const recs = [];
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
    if (risk === 'Moderate') {
        recs.push({ title: '<i class="fa-solid fa-clipboard-list"></i> Дополнительные анализы', text: 'Направить на общий анализ крови, рентген (при необходимости).', priority: 'medium' });
        recs.push({ title: '<i class="fa-solid fa-chart-line"></i> Мониторинг', text: 'Повторный осмотр через 4-6 часов. Контроль жизненных показателей каждые 2 часа.', priority: 'low' });
    }
    if (risk === 'Low' || risk === 'Stable') {
        recs.push({ title: '<i class="fa-solid fa-check"></i> Плановое наблюдение', text: 'Состояние стабильное. Продолжить текущую терапию.', priority: 'low' });
        recs.push({ title: '<i class="fa-solid fa-notes-medical"></i> Выписка', text: 'Рассмотреть возможность выписки с рекомендациями.', priority: 'low' });
    }
    return recs;
}

function generateAISummary(patient, score, risk, criterionScores) {
    const topCriteria = [...criterionScores].sort((a, b) => b.score - a.score).slice(0, 2);
    const topNames = topCriteria.map(c => c.criterion_name.toLowerCase()).join(' и ');
    const symNames = (patient.symptoms || []).map(id => {
        const s = symptomList.find(s => s.id === id);
        return s ? s.name.toLowerCase() : '';
    }).filter(Boolean).join(', ');

    return `Комплексный MCDA-анализ завершён. Итоговый балл риска: ${score}/100 (${riskLabel(risk)}). ` +
        `Основные факторы риска: ${topNames}. ` +
        (symNames ? `Выявленные симптомы: ${symNames}. ` : '') +
        `Показатели: АД ${patient.assessment.blood_pressure}, t° ${patient.assessment.temperature}°C, ` +
        `пульс ${patient.assessment.pulse} уд/мин, SpO₂ ${patient.assessment.oxygen}%. ` +
        (risk === 'Critical' || risk === 'High'
            ? 'РЕКОМЕНДАЦИЯ: Немедленная госпитализация и расширенная диагностика.'
            : risk === 'Moderate'
                ? 'РЕКОМЕНДАЦИЯ: Амбулаторное лечение с регулярным контролем.'
                : 'РЕКОМЕНДАЦИЯ: Плановое наблюдение, состояние стабильное.');
}
