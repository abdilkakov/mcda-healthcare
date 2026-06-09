// ============================================
// Patient Detail View
// ============================================

import { getPatientById } from '../data/mockData.js';
import { riskBadgeClass, riskLabel } from '../utils/mcdaEngine.js';

export function renderPatientDetail(id) {
  const p = getPatientById(id);
  if (!p) return `<div class="detail-page"><h1>Пациент не найден</h1></div>`;

  const r = p.mcdaResult;
  const a = p.assessment || {};

  return `
    <div class="detail-page">
      <div class="dot-grid"></div>

      <div class="animate-fade-up" style="animation-delay: 0.1s">
        <a class="back-link" id="link-back-dash-detail"> <i class="fa-solid fa-arrow-left"></i> Назад к списку</a>

        <div class="detail-header glass-card">
        <div class="patient-info-block">
          <div class="uppercase" style="color:var(--accent); opacity:0.8; margin-bottom:4px;">Профиль пациента</div>
          <h1>${p.full_name}</h1>
          <div class="patient-meta">ID: #PAT_${String(p.id).padStart(3, '0')} | ИИН: ${p.iin} | ${p.gender}, ${p.birth_date}</div>
        </div>
        <div class="final-score-block">
          <div class="final-score-label">Итоговый балл</div>
          <div class="final-score-value">${r?.total_score || '—'}</div>
          <span class="badge ${riskBadgeClass(r?.risk_level)}">${riskLabel(r?.risk_level)}</span>
        </div>
      </div>

      <!-- AI Summary Full Width -->
      <div class="ai-summary-section glass-card animate-fade-up" style="margin-bottom: 32px; animation-delay: 0.2s">
        <h3 style="color:var(--accent)"><i class="fa-solid fa-brain"></i> AI Executive Summary</h3>
        <div class="ai-summary-text">
          "${r?.ai_summary || 'Результаты анализа отсутствуют'}"
        </div>
      </div>

      <div class="detail-grid animate-fade-up" style="animation-delay: 0.3s">
        <!-- Radar Chart Side -->
        <div class="radar-section glass-card">
          <h3><i class="fa-solid fa-chart-line"></i> Анализ критериев</h3>
          <div class="radar-canvas-container">
             <canvas id="radar-chart" width="280" height="280"></canvas>
          </div>
          <div class="criteria-bars">
            ${(r?.criterion_scores || []).slice(0, 3).map(cs => `
              <div class="criteria-bar">
                <span class="c-icon"><i class="${cs.icon}"></i></span>
                <span class="c-label">${cs.criterion_name}</span>
                <div class="c-bar-track">
                  <div class="c-bar-fill" style="width: ${cs.score}%; background: ${cs.color}"></div>
                </div>
                <span class="c-value">${cs.score}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Evidence/Key Factors Side -->
        <div class="glass-card" style="padding: 32px;">
          <h3 style="margin-bottom: 24px; color:var(--accent)"><i class="fa-solid fa-list-check"></i> Ключевые факторы риска</h3>
          <div class="evidence-list">
            ${(r?.criterion_scores || []).sort((a, b) => b.weighted_score - a.weighted_score).map((cs, i) => `
              <div class="evidence-card">
                <div class="evidence-number">${i + 1}</div>
                <div class="evidence-body">
                  <div class="evidence-title">${cs.criterion_name}</div>
                  <div class="evidence-detail">Балл риска: ${cs.score} / 100</div>
                </div>
                <div class="evidence-impact">Влияние: ${cs.weighted_score}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div style="margin-top:32px;">
         <h2 style="margin-bottom:16px;"><i class="fa-solid fa-clipboard-list"></i> Рекомендации и действия</h2>
         <div class="recommendations-grid">
            ${(r?.recommendation || []).map(rec => `
              <div class="rec-card glass-card priority-${rec.priority}">
                <h4>${rec.title}</h4>
                <p>${rec.text}</p>
              </div>
            `).join('')}
         </div>
      </div>

      <!-- Raw Assessment Data -->
      <div style="margin-top:32px; padding:24px;" class="glass-card">
        <h3 style="margin-bottom:16px;"><i class="fa-solid fa-notes-medical"></i> Первичные данные обследования</h3>
        <div class="form-grid">
          <div class="input-group"><label>Давление</label><div class="text-secondary">${a.blood_pressure}</div></div>
          <div class="input-group"><label>Температура</label><div class="text-secondary">${a.temperature}°C</div></div>
          <div class="input-group"><label>Пульс</label><div class="text-secondary">${a.pulse} уд/мин</div></div>
          <div class="input-group"><label>Кислород</label><div class="text-secondary">${a.oxygen}%</div></div>
        </div>
        <div style="margin-top:20px;">
           <label class="uppercase" style="color:var(--text-muted); display:block; margin-bottom:8px;">Жалобы</label>
           <div class="text-secondary" style="font-size:0.9rem;">${a.complaints || 'Жалоб нет'}</div>
        </div>
        <div style="margin-top:20px;">
           <label class="uppercase" style="color:var(--text-muted); display:block; margin-bottom:8px;">Заметки врача</label>
           <div class="text-secondary" style="font-size:0.9rem;">${a.notes || 'Приметок нет'}</div>
        </div>
      </div>
    </div>
  `;
}

export function initPatientDetail(id) {
  document.getElementById('link-back-dash-detail')?.addEventListener('click', () => window.location.hash = '#/dashboard');

  const p = getPatientById(id);
  if (!p || !p.mcdaResult) return;

  // Draw Radar Chart manually on Canvas
  const canvas = document.getElementById('radar-chart');
  if (canvas) drawRadar(canvas, p.mcdaResult.criterion_scores);
}

function drawRadar(canvas, scores) {
  const ctx = canvas.getContext('2d');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = canvas.width / 2 - 40;
  const numCriteria = scores.length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background circles
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 5; i++) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, (radius / 5) * i, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Axi lines
  ctx.beginPath();
  for (let i = 0; i < numCriteria; i++) {
    const angle = (Math.PI * 2 * i) / numCriteria - Math.PI / 2;
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
  }
  ctx.stroke();

  // Radar polygon
  const coords = scores.map((s, i) => {
    const angle = (Math.PI * 2 * i) / numCriteria - Math.PI / 2;
    const r = (radius * s.score) / 100;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle)
    };
  });

  ctx.beginPath();
  ctx.moveTo(coords[0].x, coords[0].y);
  for (let i = 1; i < numCriteria; i++) ctx.lineTo(coords[i].x, coords[i].y);
  ctx.closePath();

  ctx.fillStyle = 'rgba(200, 255, 0, 0.3)';
  ctx.fill();
  ctx.strokeStyle = '#c8ff00';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Data points & Labels
  scores.forEach((s, i) => {
    const angle = (Math.PI * 2 * i) / numCriteria - Math.PI / 2;
    const r = (radius * s.score) / 100;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);

    // Point
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Text Label
    const lx = centerX + (radius + 20) * Math.cos(angle);
    const ly = centerY + (radius + 20) * Math.sin(angle);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '700 10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(s.criterion_name.toUpperCase(), lx, ly);
  });
}
