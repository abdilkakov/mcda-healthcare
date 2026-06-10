// ============================================
// Main Entry Point & Router
// ============================================

import { renderLogin, initLogin } from './views/login.js';
import { renderDashboard, initDashboard } from './views/dashboard.js';
import { renderPatientForm, initPatientForm } from './views/patientForm.js';
import { renderPatientDetail, initPatientDetail } from './views/patientDetail.js';

const routes = {
  '/login': { render: renderLogin, init: initLogin },
  '/dashboard': { render: renderDashboard, init: initDashboard },
  '/form': { render: renderPatientForm, init: initPatientForm },
  '/patient/:id': { render: renderPatientDetail, init: initPatientDetail },
};

/**
 * Resolve the current hash route and render the matching view.
 */
async function router() {
  const app = document.getElementById('app');
  let hash = window.location.hash || '#/login';

  const user = sessionStorage.getItem('mcda_user');
  if (!user && hash !== '#/login') {
    window.location.hash = '#/login';
    return;
  }

  let view = null;
  let params = {};

  if (hash.startsWith('#/patient/')) {
    view = routes['/patient/:id'];
    params.id = hash.split('/')[2];
  } else {
    view = routes[hash.slice(1)];
  }

  if (!view) {
    window.location.hash = '#/login';
    return;
  }

  app.innerHTML = `<div class="route-transition animate-fade-up"><div class="loading-state">Загрузка...</div></div>`;

  try {
    const html = await view.render(params.id);
    app.innerHTML = `<div class="route-transition animate-fade-up">${html}</div>`;
    await view.init(params.id);
    window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="route-transition animate-fade-up"><div class="loading-state" style="color:var(--risk-critical)">Ошибка: ${err.message}</div></div>`;
  }
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);
