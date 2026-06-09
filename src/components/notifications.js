// ============================================
// Notification System — Toasts & Modals
// ============================================

const container = () => document.getElementById('notification-container');
const overlay = () => document.getElementById('modal-overlay');

export function showToast(type, title, message, duration = 5000) {
  const icon = type === 'critical' ? 'fa-triangle-exclamation' : type === 'warning' ? 'fa-bell' : 'fa-check';
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <span class="toast-icon"><i class="fa-solid ${icon}"></i></span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.closest('.toast').remove()">✕</button>
  `;
  container().appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-exit');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

export function showCriticalPatientsModal(criticalPatients) {
  const ol = overlay();
  ol.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2><i class="fa-solid fa-triangle-exclamation" style="color:var(--risk-critical)"></i> Внимание! Критические пациенты</h2>
        <button class="modal-close" id="modal-close-btn">✕</button>
      </div>
      <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 0.9rem;">
        Обнаружены пациенты, требующие немедленного внимания:
      </p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${criticalPatients.map(p => `
          <div class="evidence-card" style="cursor:pointer;" data-patient-id="${p.id}">
            <div class="evidence-number" style="background:var(--risk-critical);color:#fff;">${p.mcdaResult?.total_score || '?'}</div>
            <div class="evidence-body">
              <div class="evidence-title">${p.full_name}</div>
              <div class="evidence-detail">${p.mcdaResult?.possible_diagnosis || 'Требуется анализ'}</div>
            </div>
            <span class="badge badge-critical">${p.mcdaResult?.risk_level || 'N/A'}</span>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:20px;text-align:right;">
        <button class="btn btn-accent" id="modal-ok-btn">Понятно</button>
      </div>
    </div>
  `;
  ol.classList.add('active');

  const close = () => ol.classList.remove('active');
  ol.querySelector('#modal-close-btn').addEventListener('click', close);
  ol.querySelector('#modal-ok-btn').addEventListener('click', close);
  ol.addEventListener('click', e => { if (e.target === ol) close(); });

  // Click on patient card → navigate
  ol.querySelectorAll('[data-patient-id]').forEach(card => {
    card.addEventListener('click', () => {
      close();
      window.location.hash = `#/patient/${card.dataset.patientId}`;
    });
  });
}
