// ============================================
// Main Entry Point & Router
// ============================================

import { runMCDA } from './utils/mcdaEngine.js';
import { initializeResults } from './data/mockData.js';
import { renderLogin, initLogin } from './views/login.js';
import { renderDashboard, initDashboard } from './views/dashboard.js';
import { renderPatientForm, initPatientForm } from './views/patientForm.js';
import { renderPatientDetail, initPatientDetail } from './views/patientDetail.js';

// Global export for mock engine to be used by mockData
window.__mcdaEngine = { runMCDA };

const routes = {
    '/login': { render: renderLogin, init: initLogin },
    '/dashboard': { render: renderDashboard, init: initDashboard },
    '/form': { render: renderPatientForm, init: initPatientForm },
    '/patient/:id': { render: renderPatientDetail, init: initPatientDetail },
};

function router() {
    const app = document.getElementById('app');
    let hash = window.location.hash || '#/login';

    // Auth Check
    const user = sessionStorage.getItem('mcda_user');
    if (!user && hash !== '#/login') {
        window.location.hash = '#/login';
        return;
    }

    // Parse route and ID
    let view = null;
    let params = {};

    if (hash.startsWith('#/patient/')) {
        view = routes['/patient/:id'];
        params.id = hash.split('/')[2];
    } else {
        view = routes[hash.slice(1)];
    }

    if (view) {
        app.innerHTML = `<div class="route-transition animate-fade-up">${view.render(params.id)}</div>`;
        view.init(params.id);

        // Ensure scroll to top on route change
        window.scrollTo(0, 0);
    } else {
        window.location.hash = '#/login';
    }
}

// Initialize everything
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
    initializeResults(); // Compute results for mock patients
    router();
});
