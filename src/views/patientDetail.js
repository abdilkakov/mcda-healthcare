// ============================================
// Patient Detail View
// ============================================

import { getPatient, getAllDocuments, getAIRecommendations } from '../api/client.js';
import { addRecommendation, voteRecommendation, uploadDocument, deleteDocument } from '../api/client.js';
import { riskBadgeClass, riskLabel } from '../utils/mcdaEngine.js';

let currentPatient = null;

/**
 * Fetch patient data and render the detail page HTML.
 */
export async function renderPatientDetail(id) {
  const p = await getPatient(id);
  const aiRecs = await getAIRecommendations(id);
  
  currentPatient = p;

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

          <div class="patient-diagnosis" style="margin-top: 12px; font-size: 1.1rem; font-weight: 600; color: var(--accent);">
             <i class="fa-solid fa-stethoscope"></i> Диагноз: ${r?.possible_diagnosis || 'Не установлен'}
          </div>
        </div>
        <div class="final-score-block">
          <div class="final-score-label">Итоговый балл</div>
          <div class="final-score-value">${r?.total_score || '—'}</div>
          <span class="badge ${riskBadgeClass(r?.risk_level)}">${riskLabel(r?.risk_level)}</span>
        </div>
      </div>

      <div class="ai-summary-section glass-card animate-fade-up" style="margin-bottom: 32px; animation-delay: 0.2s">
        <h3 style="color:var(--accent)"><i class="fa-solid fa-brain"></i> AI Executive Summary</h3>
        <div class="ai-summary-text">
          "${r?.ai_summary || 'Результаты анализа отсутствуют'}"
        </div>
      </div>

      <div class="detail-grid animate-fade-up" style="animation-delay: 0.3s">
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

      ${(() => {
        const allExtractedRecs = [];
        
        // 1. Process patient-specific documents first (assume these are 100% relevant)
        (currentPatient?.documents || []).forEach(doc => {
           if (doc.extracted_data && doc.extracted_data.recommended_sentences) {
               doc.extracted_data.recommended_sentences.forEach(s => {
                   allExtractedRecs.push({ text: s, source: doc.filename, score: null });
               });
           }
        });
        
        // 2. Add the ML-ranked Global Knowledge base recommendations
        aiRecs.forEach(r => {
            allExtractedRecs.push(r);
        });

        if (allExtractedRecs.length === 0) return '';
        
        return `
          <div style="margin-top:32px; animation-delay: 0.35s" class="animate-fade-up">
            <h2 style="margin-bottom:16px; color:var(--accent);"><i class="fa-solid fa-wand-magic-sparkles"></i> AI-Извлеченные клинические рекомендации</h2>
            <p class="text-secondary" style="margin-bottom: 16px;">Отранжировано нейросетью по релевантности профилю пациента</p>
            <div class="recommendations-grid">
              ${allExtractedRecs.map(rec => `
                <div class="rec-card glass-card priority-high" style="border: 1px solid var(--accent-glow);">
                  <div style="margin-bottom: 8px; display:flex; justify-content:space-between; align-items:center;">
                     <span class="badge" style="background:var(--accent-glow); color:var(--accent); font-size:0.75rem;"><i class="fa-solid fa-file-medical"></i> Источник: ${rec.source}</span>
                     ${rec.score ? `<span style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-bullseye"></i> Совпадение: ${rec.score}%</span>` : ''}
                  </div>
                  <div style="position:relative;">
                    <p class="ai-rec-text" style="font-size: 1.05rem; line-height: 1.5; font-weight: 500; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${rec.text}</p>
                    ${rec.text.length > 150 ? `
                      <button class="btn-toggle-single-rec btn" style="background:transparent; color:var(--accent); border:none; padding:4px 0; font-size:0.9rem; cursor:pointer; margin-top:4px;">Показать больше <i class="fa-solid fa-chevron-down" style="margin-left:4px;"></i></button>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      })()}

      <div style="margin-top:32px;">
         <h2 style="margin-bottom:16px;"><i class="fa-solid fa-clipboard-list"></i> Рекомендации (Консилиум)</h2>
         <div class="recommendations-grid">
            ${(currentPatient?.recommendations || []).map(rec => `
              <div class="rec-card glass-card priority-${rec.type === 'ai' ? 'high' : 'medium'}" style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                  <h4>${rec.type === 'ai' ? '🤖 AI Ассистент' : `👨‍⚕️ ${rec.doctor_name || 'Врач'}`}</h4>
                  <p>${rec.text}</p>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center; gap:4px; margin-left:16px;">
                  <button class="btn btn-icon upvote-btn" data-id="${rec.id}" style="padding:4px;"><i class="fa-solid fa-chevron-up"></i></button>
                  <span style="font-weight:bold; font-size:1.1rem;">${rec.total_votes || 0}</span>
                  <button class="btn btn-icon downvote-btn" data-id="${rec.id}" style="padding:4px;"><i class="fa-solid fa-chevron-down"></i></button>
                </div>
              </div>
            `).join('')}
            ${(currentPatient?.recommendations || []).length === 0 ? '<p class="text-secondary">Рекомендаций пока нет.</p>' : ''}
         </div>

         <div class="glass-card" style="margin-top: 16px; padding: 16px;">
            <h4 style="margin-bottom:8px;">Добавить рекомендацию</h4>
            <div style="display:flex; gap:8px;">
                <input type="text" id="new-rec-input" class="input-field" placeholder="Ваша рекомендация..." style="flex:1;">
                <button class="btn btn-accent" id="btn-add-rec">Добавить</button>
            </div>
         </div>
      </div>

      <div style="margin-top:32px; padding:24px;" class="glass-card">
         <h3 style="margin-bottom:16px;"><i class="fa-solid fa-file-medical"></i> Медицинские документы</h3>
         
         <div style="display:flex; gap:16px; margin-bottom:24px; align-items:center;">
             <input type="file" id="doc-upload-file" style="display:none;">
             <button class="btn btn-accent" id="btn-trigger-upload" onclick="document.getElementById('doc-upload-file').click()"><i class="fa-solid fa-upload"></i> Загрузить</button>
             <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="doc-is-protocol">
                Медицинский протокол (Для ИИ)
             </label>
         </div>

         <div class="documents-list">
            ${(currentPatient?.documents || []).length === 0 ? '<p class="text-secondary">Нет загруженных документов.</p>' : ''}
            ${(currentPatient?.documents || []).map(doc => `
                <div class="doc-card glass-card" style="margin-bottom:12px; padding:12px; position:relative;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-weight:600;"><i class="fa-solid fa-file-alt" style="color:var(--accent);"></i> ${doc.filename}</div>
                        <div style="display:flex; gap: 12px; align-items:center;">
                            <div class="text-secondary" style="font-size:0.85rem;">${doc.created_at}</div>
                            <button class="btn btn-icon delete-doc-btn" data-id="${doc.id}" style="color: var(--risk-critical); padding: 4px; border:none; background:transparent;"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                    ${doc.is_protocol ? `<span class="badge" style="background:#22c55e; margin-top:8px; display:inline-block;">Протокол</span>` : ''}
                    ${doc.extracted_text ? `
                        <div style="margin-top:8px; font-size:0.85rem; color:var(--text-muted); background:rgba(0,0,0,0.2); padding:8px; border-radius:4px; max-height:100px; overflow-y:auto;">
                            <strong>AI Извлечение:</strong><br/>
                            ${doc.extracted_text.slice(0, 300)}...
                        </div>
                    ` : ''}
                </div>
            `).join('')}
         </div>
      </div>

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

/**
 * Bind back navigation and draw the radar chart canvas.
 */
export function initPatientDetail() {
  document.getElementById('link-back-dash-detail')?.addEventListener('click', () => window.location.hash = '#/dashboard');

  if (currentPatient?.mcdaResult) {
    const canvas = document.getElementById('radar-chart');
    if (canvas) drawRadar(canvas, currentPatient.mcdaResult.criterion_scores);
  }

  // Toggle AI Recommendations (Per-block)
  document.querySelectorAll('.btn-toggle-single-rec').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const p = e.currentTarget.previousElementSibling;
      if (p.style.webkitLineClamp === '3') {
        p.style.webkitLineClamp = 'unset';
        e.currentTarget.innerHTML = 'Скрыть <i class="fa-solid fa-chevron-up" style="margin-left:4px;"></i>';
      } else {
        p.style.webkitLineClamp = '3';
        e.currentTarget.innerHTML = 'Показать больше <i class="fa-solid fa-chevron-down" style="margin-left:4px;"></i>';
      }
    });
  });

  // Voting Event Listeners
  document.querySelectorAll('.upvote-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const recId = e.currentTarget.dataset.id;
      await voteRecommendation(currentPatient.id, recId, 1);
      // Re-render
      const html = await renderPatientDetail(currentPatient.id);
      document.getElementById('app').innerHTML = html;
      initPatientDetail();
    });
  });

  document.querySelectorAll('.downvote-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const recId = e.currentTarget.dataset.id;
      await voteRecommendation(currentPatient.id, recId, -1);
      // Re-render
      const html = await renderPatientDetail(currentPatient.id);
      document.getElementById('app').innerHTML = html;
      initPatientDetail();
    });
  });

  // Add Recommendation
  document.getElementById('btn-add-rec')?.addEventListener('click', async () => {
    const text = document.getElementById('new-rec-input').value;
    if (!text) return;
    await addRecommendation(currentPatient.id, text);
    const html = await renderPatientDetail(currentPatient.id);
    document.getElementById('app').innerHTML = html;
    initPatientDetail();
  });

  // Upload Document
  document.getElementById('doc-upload-file')?.addEventListener('change', async (e) => {
    const isProtocol = document.getElementById('doc-is-protocol').checked;
    const file = e.target.files[0];
    if (!file) return;
    
    const btnTrigger = document.getElementById('btn-trigger-upload');
    btnTrigger.disabled = true;
    btnTrigger.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Загрузка...';
    try {
      await uploadDocument(currentPatient.id, file, isProtocol);
      const html = await renderPatientDetail(currentPatient.id);
      document.getElementById('app').innerHTML = html;
      initPatientDetail();
    } catch(err) {
      alert("Ошибка загрузки: " + err.message);
      btnTrigger.disabled = false;
      btnTrigger.innerHTML = '<i class="fa-solid fa-upload"></i> Загрузить';
    }
  });

  // Delete Document
  document.querySelectorAll('.delete-doc-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if(!confirm('Удалить документ?')) return;
      const docId = e.currentTarget.dataset.id;
      try {
        await deleteDocument(currentPatient.id, docId);
        const html = await renderPatientDetail(currentPatient.id);
        document.getElementById('app').innerHTML = html;
        initPatientDetail();
      } catch(err) {
        alert("Ошибка удаления: " + err.message);
      }
    });
  });
}

/**
 * Draw a radar chart of criterion scores on the given canvas element.
 */
function drawRadar(canvas, scores) {
  const ctx = canvas.getContext('2d');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = canvas.width / 2 - 40;
  const numCriteria = scores.length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 5; i++) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, (radius / 5) * i, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.beginPath();
  for (let i = 0; i < numCriteria; i++) {
    const angle = (Math.PI * 2 * i) / numCriteria - Math.PI / 2;
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
  }
  ctx.stroke();

  const coords = scores.map((s, i) => {
    const angle = (Math.PI * 2 * i) / numCriteria - Math.PI / 2;
    const r = (radius * s.score) / 100;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
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

  scores.forEach((s, i) => {
    const angle = (Math.PI * 2 * i) / numCriteria - Math.PI / 2;
    const r = (radius * s.score) / 100;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    const lx = centerX + (radius + 20) * Math.cos(angle);
    const ly = centerY + (radius + 20) * Math.sin(angle);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '700 10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(s.criterion_name.toUpperCase(), lx, ly);
  });
}
