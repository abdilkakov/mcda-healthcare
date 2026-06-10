// ============================================
// API client — fetch wrapper with JWT auth
// ============================================

const API_BASE = `${window.location.origin}/api`;

/**
 * Perform an authenticated API request; redirects to login on 401.
 */
async function request(path, options = {}) {
  const token = sessionStorage.getItem('mcda_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    sessionStorage.removeItem('mcda_token');
    sessionStorage.removeItem('mcda_user');
    window.location.hash = '#/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Ошибка запроса');
  }

  return res.json();
}

/**
 * Authenticate with login and password; stores token and user in session.
 */
export async function login(loginName, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: loginName, password }),
  });
  sessionStorage.setItem('mcda_token', data.token);
  sessionStorage.setItem('mcda_user', JSON.stringify(data.user));
  return data.user;
}

/**
 * Fetch all patients and dashboard statistics.
 */
export async function getPatients() {
  return request('/patients');
}

/**
 * Fetch a single patient by ID.
 */
export async function getPatient(id) {
  const data = await request(`/patients/${id}`);
  return data.patient;
}

/**
 * Create a new patient with assessment; MCDA runs on the server.
 */
export async function createPatient(payload) {
  const data = await request('/patients', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.patient;
}

/**
 * Fetch symptom catalogue for the patient form.
 */
export async function getSymptoms() {
  const data = await request('/symptoms');
  return data.symptoms;
}

/**
 * Fetch unread notifications for the dashboard modal.
 */
export async function getNotifications(unreadOnly = true) {
  const query = unreadOnly ? '?unread=true' : '';
  const data = await request(`/notifications${query}`);
  return data.notifications;
}

/**
 * Mark all notifications as read after the user dismisses the modal.
 */
export async function markAllNotificationsRead() {
  return request('/notifications/read-all', { method: 'PATCH' });
}
