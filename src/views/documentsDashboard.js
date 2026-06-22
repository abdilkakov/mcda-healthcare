// ============================================
// AI Documents Dashboard View
// ============================================

import { getAllDocuments, deleteDocument, uploadDocument } from '../api/client.js';

let allDocuments = [];
let currentDoc = null;

const medicalKeywords = [
  'диабет', 'гипертония', 'пневмония', 'аспирин', 'парацетамол', 'инсулин', 
  'давление', 'температура', 'пульс', 'кислород', 'симптомы', 'лечение', 
  'протокол', 'диагноз', 'пациент', 'рекомендация', 'diabetes', 'hypertension', 'pneumonia'
];

/**
 * Basic highlighter for medical terms.
 */
function highlightMedicalTerms(text) {
  if (!text) return '';
  let highlighted = text;
  
  // Escape html first to prevent injection from markdown
  const escapeHtml = (unsafe) => {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  };
  
  highlighted = escapeHtml(highlighted);

  // Simple regex replacement for keywords (case-insensitive)
  medicalKeywords.forEach(keyword => {
    // Standard \b fails on Cyrillic characters in JS. Use Unicode property escapes \p{L}
    const regex = new RegExp(`(?<=^|[^\\p{L}])(${keyword})(?=[^\\p{L}]|$)`, 'giu');
    highlighted = highlighted.replace(regex, '<span class="highlight-medical">$1</span>');
  });

  return highlighted;
}

/**
 * Format document list.
 */
function renderDocList(docs) {
  if (docs.length === 0) return `<div class="text-secondary" style="padding:0 16px;">Нет документов</div>`;
  return docs.map(doc => `
    <div class="doc-list-item ${currentDoc?.id === doc.id ? 'active' : ''}" data-id="${doc.id}" style="position:relative; padding-right:32px;">
      <button class="btn btn-icon btn-delete-doc" data-id="${doc.id}" data-patient="${doc.patient_id}" style="position:absolute; top:8px; right:4px; color:var(--risk-critical); padding:4px; border:none; background:transparent;">
        <i class="fa-solid fa-trash"></i>
      </button>
      <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 4px;">
        <i class="fa-solid ${doc.is_protocol ? 'fa-book-medical' : 'fa-file-lines'}" style="margin-right: 8px;"></i>
        ${doc.filename}
      </div>
      <div style="font-size: 0.8rem; color: var(--text-muted); display:flex; justify-content:space-between;">
        <span>${doc.created_at.slice(0, 10)}</span>
        <span>${doc.patient_name && doc.patient_name !== 'Knowledge Base' ? 'Пациент: ' + doc.patient_name : ''}</span>
      </div>
    </div>
  `).join('');
}

/**
 * Render the main 3-pane layout.
 */
export async function renderDocumentsDashboard() {
  try {
    allDocuments = await getAllDocuments() || [];
  } catch (err) {
    console.error(err);
    allDocuments = [];
  }

  // Auto-select first doc if none selected
  if (!currentDoc && allDocuments.length > 0) {
    currentDoc = allDocuments[0];
  }

  const protocols = allDocuments.filter(d => d.is_protocol);
  const patientDocs = allDocuments.filter(d => !d.is_protocol);

  return `
    <div class="dashboard-page" style="height: 100vh; display: flex; flex-direction: column;">
      <div class="dot-grid"></div>

      <header class="topbar" style="height: 93px; flex-shrink: 0;">
        <div class="topbar-logo" style="display:flex; align-items:center; gap:16px;">
          <button class="btn btn-icon" id="btn-back-dash" title="Назад" style="background:transparent; border:none; color:var(--text-muted); font-size:1.2rem; padding:0;">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <div class="logo-icon"><i class="fa-solid fa-book-medical"></i></div>
          <div class="logo-text">База знаний <span>AI Анализ</span></div>
        </div>
        <div class="topbar-actions">
        </div>
      </header>

      <div class="docs-layout">
        <!-- LEFT SIDEBAR -->
        <aside class="docs-sidebar" id="sidebar-left">
          <input type="file" id="global-doc-upload" style="display:none;">
          <div class="doc-list-group">
            <h4 style="display:flex; justify-content:space-between; align-items:center;">
              <span><i class="fa-solid fa-book"></i> Протоколы и Стандарты</span>
              <div>
                <button class="btn btn-icon" id="btn-upload-global" title="Загрузить протокол" style="padding:4px; color:var(--accent); background:transparent; border:none;"><i class="fa-solid fa-plus"></i></button>
                <button class="btn btn-icon" id="btn-toggle-left" title="Скрыть панель" style="padding:4px; color:var(--text-muted); background:transparent; border:none; margin-left:8px;"><i class="fa-solid fa-chevron-left"></i></button>
              </div>
            </h4>
            <div id="list-protocols">
              ${renderDocList(protocols)}
            </div>
          </div>
          <div class="doc-list-group" style="margin-top: 16px;">
            <h4><i class="fa-solid fa-folder-open"></i> Данные пациентов</h4>
            <div id="list-patients">
              ${renderDocList(patientDocs)}
            </div>
          </div>
        </aside>

        <!-- MAIN CONTENT -->
        <main class="docs-main" style="position: relative;">
          <button class="btn btn-icon" id="btn-open-left" style="display:none; position:absolute; top:50%; left:0; transform:translateY(-50%); z-index:100; font-size:1.2rem; background:var(--bg-card); border:1px solid var(--bg-card-border); border-left:none; border-radius:0 12px 12px 0; padding:24px 8px; box-shadow:0 4px 12px rgba(0,0,0,0.5); color:var(--accent);"><i class="fa-solid fa-chevron-right"></i></button>
          <button class="btn btn-icon" id="btn-open-right" style="display:none; position:absolute; top:50%; right:0; transform:translateY(-50%); z-index:100; font-size:1.2rem; background:var(--bg-card); border:1px solid var(--bg-card-border); border-right:none; border-radius:12px 0 0 12px; padding:24px 8px; box-shadow:0 4px 12px rgba(0,0,0,0.5); color:var(--accent);"><i class="fa-solid fa-chevron-left"></i></button>
          
          ${currentDoc ? `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
              <h2>${currentDoc.filename}</h2>
            </div>
            <div class="doc-content">
              ${currentDoc.extracted_text 
                ? highlightMedicalTerms(currentDoc.extracted_text)
                : '<span class="text-secondary">Нет распознанного текста для данного документа.</span>'
              }
            </div>
          ` : `
            <div style="display:flex; height:100%; align-items:center; justify-content:center; color:var(--text-muted); flex-direction:column; gap:16px;">
              <i class="fa-solid fa-file-circle-question" style="font-size: 4rem; color: rgba(255,255,255,0.1);"></i>
              <h3>Выберите документ из списка слева</h3>
            </div>
          `}
        </main>

        <!-- RIGHT SIDEBAR (AI ANALYSIS) -->
        <aside class="docs-sidebar-right" id="sidebar-right">
          <div style="padding: 24px;">
            <h3 style="margin-bottom: 24px; color: var(--accent); display:flex; align-items:center; justify-content:space-between;">
              <span><i class="fa-solid fa-robot"></i> AI Анализ</span>
              <button class="btn btn-icon" id="btn-toggle-right" title="Скрыть панель" style="color:var(--text-muted); background:transparent; border:none; padding:0;"><i class="fa-solid fa-chevron-right"></i></button>
            </h3>
            
            ${currentDoc ? `
              <div class="glass-card" style="padding: 16px; margin-bottom: 16px;">
                <h4 style="margin-bottom: 8px; font-size: 0.9rem; color: var(--text-secondary);">Метаданные документа</h4>
                <div style="font-size: 0.85rem; line-height: 1.6;">
                  <div><strong>Тип:</strong> ${currentDoc.is_protocol ? 'Медицинский протокол' : 'Документ пациента'}</div>
                  <div><strong>Дата:</strong> ${currentDoc.created_at}</div>
                  ${currentDoc.patient_name ? `<div><strong>Привязка:</strong> ${currentDoc.patient_name}</div>` : ''}
                </div>
              </div>

              <div class="glass-card" style="padding: 16px;">
                <h4 style="margin-bottom: 12px; font-size: 0.9rem; color: var(--text-secondary);">Ключевые сущности</h4>
                ${currentDoc.extracted_text ? `
                  <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">
                    Найденные термины (Regex Highlighting):
                  </p>
                  <div style="display:flex; flex-wrap:wrap; gap:8px;">
                    ${medicalKeywords.filter(k => currentDoc.extracted_text.toLowerCase().includes(k)).map(k => `
                      <span class="badge" style="background: rgba(200, 255, 0, 0.1); color: var(--accent); border: 1px solid rgba(200, 255, 0, 0.3);">${k}</span>
                    `).join('') || '<span class="text-secondary">Ключевых сущностей не найдено</span>'}
                  </div>
                ` : '<p class="text-secondary" style="font-size: 0.85rem;">Текст отсутствует</p>'}
              </div>
            ` : `
              <p class="text-secondary">Ожидание выбора документа...</p>
            `}
          </div>
        </aside>
      </div>
    </div>
  `;
}

/**
 * Initialize event listeners.
 */
export async function initDocumentsDashboard() {
  // Navigation
  document.getElementById('btn-back-dash')?.addEventListener('click', () => {
    window.location.hash = '#/dashboard';
  });

  // Toggles
  document.getElementById('btn-toggle-left')?.addEventListener('click', () => {
    document.getElementById('sidebar-left')?.classList.add('collapsed');
    document.getElementById('btn-open-left').style.display = 'block';
  });

  document.getElementById('btn-open-left')?.addEventListener('click', () => {
    document.getElementById('sidebar-left')?.classList.remove('collapsed');
    document.getElementById('btn-open-left').style.display = 'none';
  });

  document.getElementById('btn-toggle-right')?.addEventListener('click', () => {
    document.getElementById('sidebar-right')?.classList.add('collapsed');
    document.getElementById('btn-open-right').style.display = 'block';
  });

  document.getElementById('btn-open-right')?.addEventListener('click', () => {
    document.getElementById('sidebar-right')?.classList.remove('collapsed');
    document.getElementById('btn-open-right').style.display = 'none';
  });

  // Document selection
  document.querySelectorAll('.doc-list-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      const docId = parseInt(e.currentTarget.dataset.id, 10);
      currentDoc = allDocuments.find(d => d.id === docId);
      
      // Re-render
      const app = document.getElementById('app');
      app.innerHTML = await renderDocumentsDashboard();
      await initDocumentsDashboard();
    });
  });

  // Delete document
  document.querySelectorAll('.btn-delete-doc').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if(!confirm('Удалить документ?')) return;
      const docId = e.currentTarget.dataset.id;
      const patientId = e.currentTarget.dataset.patient;
      try {
        await deleteDocument(patientId, docId);
        if (currentDoc && currentDoc.id === parseInt(docId, 10)) {
          currentDoc = null; // reset selection
        }
        const app = document.getElementById('app');
        app.innerHTML = await renderDocumentsDashboard();
        await initDocumentsDashboard();
      } catch(err) {
        alert("Ошибка удаления: " + err.message);
      }
    });
  });

  // Global document upload
  document.getElementById('btn-upload-global')?.addEventListener('click', () => {
    document.getElementById('global-doc-upload').click();
  });

  document.getElementById('global-doc-upload')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const btnTrigger = document.getElementById('btn-upload-global');
    btnTrigger.disabled = true;
    btnTrigger.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      // 0 represents the Global Knowledge Base patient
      await uploadDocument(0, file, true);
      const app = document.getElementById('app');
      app.innerHTML = await renderDocumentsDashboard();
      await initDocumentsDashboard();
    } catch(err) {
      alert("Ошибка загрузки: " + err.message);
      btnTrigger.disabled = false;
      btnTrigger.innerHTML = '<i class="fa-solid fa-plus"></i>';
    }
  });
}
