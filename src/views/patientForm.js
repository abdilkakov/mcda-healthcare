// ============================================
// Patient Form View
// ============================================

import { getSymptoms, createPatient } from '../api/client.js';
import { showToast } from '../components/notifications.js';

/**
 * Fetch symptoms and render the patient registration form.
 */
export async function renderPatientForm() {
  const symptoms = await getSymptoms();

  return `
    <div class="form-page">
      <div class="dot-grid"></div>
      
      <div class="animate-fade-up" style="animation-delay: 0.1s">
        <a class="back-link" id="link-back-dash"> <i class="fa-solid fa-arrow-left"></i> Назад к списку</a>

        <div class="form-header glass-card">
        <h1><i class="fa-solid fa-hospital-user"></i> Регистрация пациента</h1>
        <div class="form-subtitle">Заполните анкету для проведения мультикритериального анализа</div>
      </div>

      <form id="patient-form">
        <div class="form-section glass-card">
          <h3><i class="fa-solid fa-user"></i> Основные данные</h3>
          <div class="section-divider"></div>
          <div class="form-grid">
            <div class="input-group">
              <label>ФИО Пациента</label>
              <input type="text" name="full_name" class="input-field" placeholder="Иванов Иван Иванович" required />
            </div>
            <div class="input-group">
              <label>ИИН</label>
              <input type="text" name="iin" class="input-field" placeholder="000000000000" maxlength="12" required />
            </div>
            <div class="input-group">
              <label>Дата рождения</label>
              <input type="date" name="birth_date" class="input-field" required />
            </div>
            <div class="input-group">
              <label>Пол</label>
              <select name="gender" class="input-field" required>
                <option value="М">Мужской</option>
                <option value="Ж">Женский</option>
              </select>
            </div>
            <div class="input-group">
              <label>Телефон</label>
              <input type="tel" name="phone" class="input-field" placeholder="+7 700 000 0000" required />
            </div>
          </div>
        </div>

        <div class="form-section glass-card">
          <h3><i class="fa-solid fa-staff-snake"></i> Симптоматика и жалобы</h3>
          <div class="section-divider"></div>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px;">
            Выберите симптомы и укажите степень их выраженности (1 - слабо, 10 - критично)
          </p>
          <div class="symptoms-grid">
            ${symptoms.map(s => `
              <div class="checkbox-card">
                <input type="checkbox" name="symptom" value="${s.id}" id="sym-${s.id}" />
                <div style="flex:1">
                  <label for="sym-${s.id}" style="cursor:pointer; display:block; font-weight:600; font-size:0.85rem;">${s.name}</label>
                  <div class="severity-inline">
                    <span>1</span>
                    <input type="range" name="sev-${s.id}" min="1" max="10" value="5" data-symptom-id="${s.id}" />
                    <span>10</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="form-section glass-card">
          <h3><i class="fa-solid fa-chart-line"></i> Жизненные показатели</h3>
          <div class="section-divider"></div>
          <div class="form-grid">
            <div class="input-group">
              <label>Артериальное давление (Сист/Диаст)</label>
              <input type="text" name="blood_pressure" class="input-field" placeholder="120/80" required />
            </div>
            <div class="input-group">
              <label>Температура тела (°C)</label>
              <input type="number" name="temperature" step="0.1" class="input-field" placeholder="36.6" required />
            </div>
            <div class="input-group">
              <label>Пульс (уд/мин)</label>
              <input type="number" name="pulse" class="input-field" placeholder="75" required />
            </div>
            <div class="input-group">
              <label>Кислород SpO₂ (%)</label>
              <input type="number" name="oxygen" class="input-field" placeholder="98" required />
            </div>
          </div>
          <div class="input-group" style="margin-top:20px;">
            <label>Жалобы пациента</label>
            <textarea name="complaints" class="input-field" placeholder="Опишите жалобы пациента подробнее..."></textarea>
          </div>
          <div class="input-group" style="margin-top:20px;">
            <label>Заметки врача</label>
            <textarea name="notes" class="input-field" placeholder="Дополнительные примечания..."></textarea>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-outline" id="btn-cancel">Отмена</button>
          <button type="submit" class="btn btn-accent" id="btn-submit"><i class="fa-solid fa-floppy-disk"></i> Сохранить и провести анализ</button>
        </div>
      </form>
    </div>
  `;
}

/**
 * Handle form submission — POST to API and navigate to patient detail.
 */
export function initPatientForm() {
  const form = document.getElementById('patient-form');
  if (!form) return;

  document.getElementById('link-back-dash')?.addEventListener('click', () => window.location.hash = '#/dashboard');
  document.getElementById('btn-cancel')?.addEventListener('click', () => window.location.hash = '#/dashboard');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const formData = new FormData(form);
    const submitBtn = document.getElementById('btn-submit');

    const selectedSymptoms = [];
    form.querySelectorAll('input[name="symptom"]:checked').forEach(cb => {
      selectedSymptoms.push(parseInt(cb.value));
    });

    const severities = {};
    selectedSymptoms.forEach(id => {
      severities[id] = parseInt(form.querySelector(`input[name="sev-${id}"]`).value);
    });

    const payload = {
      full_name: formData.get('full_name'),
      iin: formData.get('iin'),
      birth_date: formData.get('birth_date'),
      gender: formData.get('gender'),
      phone: formData.get('phone'),
      symptoms: selectedSymptoms,
      severities,
      assessment: {
        blood_pressure: formData.get('blood_pressure'),
        temperature: parseFloat(formData.get('temperature')),
        pulse: parseInt(formData.get('pulse')),
        oxygen: parseInt(formData.get('oxygen')),
        complaints: formData.get('complaints'),
        notes: formData.get('notes'),
      },
    };

    try {
      submitBtn.disabled = true;
      const newPatient = await createPatient(payload);
      showToast('success', 'Успех', 'Данные пациента сохранены. Анализ завершён.');
      setTimeout(() => {
        window.location.hash = `#/patient/${newPatient.id}`;
      }, 1000);
    } catch (err) {
      showToast('warning', 'Ошибка', err.message);
      submitBtn.disabled = false;
    }
  });
}
