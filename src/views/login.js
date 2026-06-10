// ============================================
// Login View
// ============================================

import { login } from '../api/client.js';

/**
 * Render the login page HTML.
 */
export function renderLogin() {
  return `
    <div class="login-page">
      <div class="dot-grid"></div>
      <div class="login-card glass-card animate-scale">
        <div class="logo-icon"><i class="fa-solid fa-hospital-user"></i></div>
        <h1>MCDA <span class="text-accent">Healthcare</span></h1>
        <p class="subtitle">Войдите для доступа к системе анализа</p>

        <form id="login-form" autocomplete="off">
          <div class="input-group">
            <label for="login-username">Логин</label>
            <div class="input-field-icon">
              <span class="icon"><i class="fa-solid fa-user"></i></span>
              <input type="text" id="login-username" class="input-field" placeholder="your_username" autocomplete="off" />
            </div>
          </div>

          <div class="input-group" style="margin-top:20px;">
            <label for="login-password">Пароль</label>
            <div class="input-field-icon">
              <span class="icon"><i class="fa-solid fa-lock"></i></span>
              <input type="password" id="login-password" class="input-field" placeholder="••••••••" autocomplete="off" />
            </div>
          </div>

          <button type="submit" class="btn btn-accent" style="margin-top:24px;">
            <i class="fa-solid fa-key"></i> Войти
          </button>

          <div id="login-error" class="login-error">Неверный логин или пароль</div>
        </form>

        <p style="margin-top:20px;font-size:0.8rem;color:var(--text-muted);">
          Демо: admin / admin
        </p>
      </div>
    </div>
  `;
}

/**
 * Wire login form submission to the auth API.
 */
export function initLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;

  setTimeout(() => document.getElementById('login-username')?.focus(), 100);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    const submitBtn = form.querySelector('button[type="submit"]');

    try {
      submitBtn.disabled = true;
      await login(username, password);
      sessionStorage.removeItem('mcda_notified');
      window.location.hash = '#/dashboard';
    } catch {
      errEl.classList.add('visible');
      setTimeout(() => errEl.classList.remove('visible'), 3000);
    } finally {
      submitBtn.disabled = false;
    }
  });
}
