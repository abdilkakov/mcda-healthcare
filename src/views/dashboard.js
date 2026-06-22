// ============================================
// Dashboard View
// ============================================

import { getPatients, getNotifications, markAllNotificationsRead } from '../api/client.js';
import { riskBadgeClass, riskLabel } from '../utils/mcdaEngine.js';
import { showToast, showCriticalPatientsModal } from '../components/notifications.js';

let patients = [];
let stats = { total: 0, critical: 0, stable: 0, moderate: 0 };

/**
 * Build two-letter initials from a full name for avatar display.
 */
function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/**
 * Render patient table rows for the dashboard.
 */
function renderRows(list) {
  return list.map((p, i) => {
    const r = p.mcdaResult;
    const risk = r?.risk_level || 'N/A';
    const score = r?.total_score ?? '—';
    const a = p.assessment || {};
    const isCritical = risk === 'Critical' || risk === 'High';
    return `
      <tr class="${isCritical ? 'row-critical' : ''}" data-id="${p.id}" style="cursor:pointer;">
        <td style="color:var(--text-muted);font-size:0.8rem;">${String(i + 1).padStart(2, '0')}</td>
        <td>
          <div class="patient-info">
            <div class="patient-avatar" style="background:${p.color || '#3b82f6'}">${getInitials(p.full_name)}</div>
            <div>
              <div class="patient-name">${p.full_name}</div>
              <div class="patient-id">#PAT_${String(p.id).padStart(3, '0')}</div>
            </div>
          </div>
        </td>
        <td>${a.blood_pressure || '—'}</td>
        <td style="color:${a.temperature >= 38 ? 'var(--risk-high)' : 'inherit'}">${a.temperature || '—'}</td>
        <td style="color:${a.pulse >= 100 ? 'var(--risk-moderate)' : 'inherit'}">${a.pulse || '—'}</td>
        <td style="color:${a.oxygen <= 92 ? 'var(--risk-critical)' : 'inherit'}">${a.oxygen ? a.oxygen + '%' : '—'}</td>
        <td>
          <span class="score-cell" style="color:${scoreColor(score)}">${score}</span>
          <span style="color:var(--text-muted);font-size:0.7rem;">/100</span>
        </td>
        <td><span class="badge ${riskBadgeClass(risk)}">${riskLabel(risk)}</span></td>
        <td style="text-align:center;"><i class="fa-solid fa-eye"></i></td>
      </tr>
    `;
  }).join('');
}

/**
 * Map numeric score to a CSS colour variable name.
 */
function scoreColor(s) {
  if (typeof s !== 'number') return 'var(--text-muted)';
  if (s >= 75) return 'var(--risk-critical)';
  if (s >= 55) return 'var(--risk-high)';
  if (s >= 35) return 'var(--risk-moderate)';
  return 'var(--risk-low)';
}

/**
 * Fetch patients from API and render the dashboard HTML.
 */
export async function renderDashboard() {
  const data = await getPatients();
  patients = data.patients;
  stats = data.stats;

  return `
    <div class="dashboard-page">
      <div class="dot-grid"></div>

      <header class="topbar">
        <div class="topbar-logo">
          <div class="logo-icon"><i class="fa-solid fa-hospital-user"></i></div>
          <div class="logo-text">MCDA<span>Healthcare | Dashboard</span></div>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-outline" id="btn-documents-dashboard"><i class="fa-solid fa-book-medical"></i> База знаний</button>
          <button class="btn btn-accent" id="btn-new-patient"><i class="fa-solid fa-plus"></i> Новый пациент</button>
          <button class="btn btn-outline" id="btn-logout"><i class="fa-solid fa-right-from-bracket"></i> Выход</button>
        </div>
      </header>

      <main class="dashboard-content">
        <div class="animate-fade-up" style="animation-delay: 0.1s">
          <p style="color:var(--text-secondary);margin-bottom:20px;font-size:0.95rem;">
            Обзор, фильтрация и сортировка пациентов по баллу риска и статусу в режиме реального времени.
          </p>

          <div class="stats-grid">
            <div class="stat-card glass-card" style="--stat-color:var(--accent)">
              <div class="stat-value text-accent">${stats.total}</div>
              <div class="stat-label">Всего</div>
            </div>
            <div class="stat-card glass-card" style="--stat-color:var(--risk-critical)">
              <div class="stat-value" style="color:var(--risk-critical)">${stats.critical}</div>
              <div class="stat-label">Критические</div>
            </div>
            <div class="stat-card glass-card" style="--stat-color:var(--risk-moderate)">
              <div class="stat-value" style="color:var(--risk-moderate)">${stats.moderate}</div>
              <div class="stat-label">Средний риск</div>
            </div>
            <div class="stat-card glass-card" style="--stat-color:var(--risk-low)">
              <div class="stat-value" style="color:var(--risk-low)">${stats.stable}</div>
              <div class="stat-label">Стабильные</div>
            </div>
          </div>
        </div>

        <div class="animate-fade-up" style="animation-delay: 0.2s">
          <div class="filter-bar">
            <div class="search-box">
              <span class="icon"><i class="fa-solid fa-magnifying-glass"></i></span>
              <input type="text" id="search-input" class="input-field" placeholder="Поиск по имени или ID..." style="padding-left:48px;" />
            </div>
          <div class="filter-pills">
            <button class="filter-pill active" data-filter="all">Все</button>
            <button class="filter-pill" data-filter="critical">Критические</button>
            <button class="filter-pill" data-filter="moderate">Средний</button>
            <button class="filter-pill" data-filter="stable">Стабильные</button>
          </div>
        </div>

        <div class="table-container">
          <div class="table-scroll">
            <table class="data-table" id="patients-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Пациент</th>
                  <th data-tooltip="Артериальное давление">Давление</th>
                  <th data-tooltip="Температура тела">Темп.</th>
                  <th data-tooltip="Частота пульса">Пульс</th>
                  <th data-tooltip="Уровень кислорода SpO₂">О₂</th>
                  <th>Итого</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="patients-tbody">
                ${renderRows(patients)}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  `;
}

/**
 * Bind row clicks, filters, logout, and critical-patient notifications.
 */
export async function initDashboard() {
  document.querySelectorAll('#patients-tbody tr[data-id]').forEach(row => {
    row.addEventListener('click', () => {
      window.location.hash = `#/patient/${row.dataset.id}`;
    });
  });

  document.getElementById('btn-new-patient')?.addEventListener('click', () => {
    window.location.hash = '#/form';
  });

  document.getElementById('btn-documents-dashboard')?.addEventListener('click', () => {
    window.location.hash = '#/documents';
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    sessionStorage.removeItem('mcda_user');
    sessionStorage.removeItem('mcda_token');
    sessionStorage.removeItem('mcda_notified');
    window.location.hash = '#/login';
  });

  document.getElementById('search-input')?.addEventListener('input', e => {
    filterTable(e.target.value, document.querySelector('.filter-pill.active')?.dataset.filter || 'all');
  });

  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const search = document.getElementById('search-input')?.value || '';
      filterTable(search, pill.dataset.filter);
    });
  });

  if (!sessionStorage.getItem('mcda_notified')) {
    sessionStorage.setItem('mcda_notified', '1');
    const criticalPatients = patients.filter(p =>
      p.mcdaResult && (p.mcdaResult.risk_level === 'Critical' || p.mcdaResult.risk_level === 'High')
    );

    if (criticalPatients.length > 0) {
      setTimeout(() => {
        showToast('critical', 'Внимание!', `Обнаружено ${criticalPatients.length} пациент(ов) в критическом состоянии`, 6000);
        setTimeout(() => showCriticalPatientsModal(criticalPatients), 1000);
      }, 500);
    }

    try {
      const notifications = await getNotifications(true);
      if (notifications.length > 0 && criticalPatients.length === 0) {
        const fromNotif = notifications.map(n => n.patient).filter(Boolean);
        if (fromNotif.length > 0) {
          setTimeout(() => showCriticalPatientsModal(fromNotif), 800);
        }
      }
      await markAllNotificationsRead();
    } catch {
      // Non-critical if notifications fail
    }
  }
}

/**
 * Filter and re-render the patient table client-side.
 */
function filterTable(search, filter) {
  const searchLower = search.toLowerCase();
  let filtered = patients;

  if (filter !== 'all') {
    filtered = filtered.filter(p => {
      const r = p.mcdaResult?.risk_level;
      if (filter === 'critical') return r === 'Critical' || r === 'High';
      if (filter === 'moderate') return r === 'Moderate';
      if (filter === 'stable') return r === 'Stable' || r === 'Low';
      return true;
    });
  }

  if (searchLower) {
    filtered = filtered.filter(p =>
      p.full_name.toLowerCase().includes(searchLower) ||
      `PAT_${String(p.id).padStart(3, '0')}`.toLowerCase().includes(searchLower)
    );
  }

  document.getElementById('patients-tbody').innerHTML = renderRows(filtered);

  document.querySelectorAll('#patients-tbody tr[data-id]').forEach(row => {
    row.addEventListener('click', () => {
      window.location.hash = `#/patient/${row.dataset.id}`;
    });
  });
}
