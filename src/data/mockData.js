// ============================================
// Mock Data — Patients, Symptoms, Users, etc.
// ============================================

export const users = [
  { id: 1, full_name: 'Доктор Асанов К.М.', email: 'admin@mcda.kz', login: 'admin', password: 'admin', role: 'doctor' }
];

export const symptoms = [
  { id: 1, name: 'Лихорадка', description: 'Повышенная температура тела' },
  { id: 2, name: 'Кашель', description: 'Сухой или влажный кашель' },
  { id: 3, name: 'Одышка', description: 'Затруднённое дыхание' },
  { id: 4, name: 'Боль в груди', description: 'Боль или давление в области грудной клетки' },
  { id: 5, name: 'Головная боль', description: 'Различной интенсивности' },
  { id: 6, name: 'Тошнота', description: 'Тошнота или рвота' },
  { id: 7, name: 'Слабость', description: 'Общая слабость и утомляемость' },
  { id: 8, name: 'Боль в животе', description: 'Боль в области живота' },
  { id: 9, name: 'Головокружение', description: 'Вестибулярные нарушения' },
  { id: 10, name: 'Потеря сознания', description: 'Кратковременая потеря сознания' },
  { id: 11, name: 'Отёки', description: 'Отёк конечностей или лица' },
  { id: 12, name: 'Судороги', description: 'Непроизвольные мышечные сокращения' },
];

export const criteria = [
  { id: 1, name: 'Давление', description: 'Артериальное давление', weight: 0.25, icon: 'fa-solid fa-heart-pulse' },
  { id: 2, name: 'Температура', description: 'Температура тела', weight: 0.20, icon: 'fa-solid fa-thermometer-half' },
  { id: 3, name: 'Пульс', description: 'Частота пульса', weight: 0.20, icon: 'fa-solid fa-heart-pulse' },
  { id: 4, name: 'Кислород', description: 'Уровень кислорода в крови', weight: 0.20, icon: 'fa-solid fa-lungs' },
  { id: 5, name: 'Симптомы', description: 'Тяжесть симптомов', weight: 0.15, icon: 'fa-solid fa-notes-medical' },
];

const avatarColors = [
  '#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#22c55e',
  '#06b6d4', '#ec4899', '#eab308', '#14b8a6', '#6366f1'
];

export let patients = [
  {
    id: 1, full_name: 'Иванов Алексей Петрович', iin: '920514350128',
    birth_date: '1992-05-14', gender: 'М', phone: '+7 701 123 4567',
    created_at: '2026-05-28', created_by: 1, color: avatarColors[0],
    symptoms: [1, 3, 4], severities: { 1: 8, 3: 9, 4: 7 },
    assessment: { blood_pressure: '180/110', temperature: 39.2, pulse: 115, oxygen: 88, complaints: 'Сильная одышка, боль в груди при вдохе', notes: 'Поступил экстренно' },
  },
  {
    id: 2, full_name: 'Сергеева Мария Ивановна', iin: '850923451234',
    birth_date: '1985-09-23', gender: 'Ж', phone: '+7 702 234 5678',
    created_at: '2026-05-29', created_by: 1, color: avatarColors[1],
    symptoms: [2, 7], severities: { 2: 4, 7: 3 },
    assessment: { blood_pressure: '125/80', temperature: 37.5, pulse: 82, oxygen: 96, complaints: 'Лёгкий кашель, общая слабость', notes: '' },
  },
  {
    id: 3, full_name: 'Касымов Нурлан Бериккалиевич', iin: '780312678901',
    birth_date: '1978-03-12', gender: 'М', phone: '+7 705 345 6789',
    created_at: '2026-05-27', created_by: 1, color: avatarColors[2],
    symptoms: [1, 4, 10, 12], severities: { 1: 9, 4: 10, 10: 8, 12: 7 },
    assessment: { blood_pressure: '200/130', temperature: 40.1, pulse: 140, oxygen: 82, complaints: 'Потеря сознания, судороги, острая боль в груди', notes: 'КРИТИЧЕСКОЕ СОСТОЯНИЕ' },
  },
  {
    id: 4, full_name: 'Ахметова Айгуль Тлековна', iin: '950701234567',
    birth_date: '1995-07-01', gender: 'Ж', phone: '+7 707 456 7890',
    created_at: '2026-05-30', created_by: 1, color: avatarColors[3],
    symptoms: [5, 6], severities: { 5: 5, 6: 4 },
    assessment: { blood_pressure: '118/75', temperature: 36.8, pulse: 74, oxygen: 98, complaints: 'Головная боль, лёгкая тошнота', notes: 'Стабильное состояние' },
  },
  {
    id: 5, full_name: 'Петров Дмитрий Сергеевич', iin: '880415567890',
    birth_date: '1988-04-15', gender: 'М', phone: '+7 708 567 8901',
    created_at: '2026-05-30', created_by: 1, color: avatarColors[4],
    symptoms: [7], severities: { 7: 2 },
    assessment: { blood_pressure: '120/80', temperature: 36.6, pulse: 70, oxygen: 99, complaints: 'Лёгкая усталость', notes: 'Готов к выписке' },
  },
  {
    id: 6, full_name: 'Жумабаев Ерлан Канатович', iin: '900228890123',
    birth_date: '1990-02-28', gender: 'М', phone: '+7 700 678 9012',
    created_at: '2026-05-26', created_by: 1, color: avatarColors[5],
    symptoms: [1, 3, 8, 11], severities: { 1: 7, 3: 8, 8: 6, 11: 5 },
    assessment: { blood_pressure: '165/100', temperature: 38.8, pulse: 108, oxygen: 90, complaints: 'Одышка, боль в животе, отёки ног', notes: 'Подозрение на сердечную недостаточность' },
  },
  {
    id: 7, full_name: 'Козлова Елена Андреевна', iin: '000513345678',
    birth_date: '2000-05-13', gender: 'Ж', phone: '+7 771 789 0123',
    created_at: '2026-06-01', created_by: 1, color: avatarColors[6],
    symptoms: [2, 5, 9], severities: { 2: 3, 5: 4, 9: 3 },
    assessment: { blood_pressure: '110/70', temperature: 37.2, pulse: 78, oxygen: 97, complaints: 'Кашель, головная боль, головокружение', notes: '' },
  },
  {
    id: 8, full_name: 'Байтурсынов Аскар Маратович', iin: '750820123456',
    birth_date: '1975-08-20', gender: 'М', phone: '+7 747 890 1234',
    created_at: '2026-05-25', created_by: 1, color: avatarColors[7],
    symptoms: [1, 3, 4, 10], severities: { 1: 9, 3: 10, 4: 9, 10: 6 },
    assessment: { blood_pressure: '190/120', temperature: 39.5, pulse: 130, oxygen: 84, complaints: 'Острая боль в груди, тяжёлая одышка', notes: 'Экстренный случай — инфаркт?' },
  },
  {
    id: 9, full_name: 'Нурланова Дина Серикказы', iin: '980107456789',
    birth_date: '1998-01-07', gender: 'Ж', phone: '+7 778 901 2345',
    created_at: '2026-06-01', created_by: 1, color: avatarColors[8],
    symptoms: [6, 8], severities: { 6: 5, 8: 6 },
    assessment: { blood_pressure: '130/85', temperature: 37.0, pulse: 85, oxygen: 96, complaints: 'Тошнота, боль в животе', notes: 'Направить на УЗИ' },
  },
  {
    id: 10, full_name: 'Смирнов Олег Викторович', iin: '830629789012',
    birth_date: '1983-06-29', gender: 'М', phone: '+7 776 012 3456',
    created_at: '2026-05-31', created_by: 1, color: avatarColors[9],
    symptoms: [2, 7, 9], severities: { 2: 3, 7: 4, 9: 2 },
    assessment: { blood_pressure: '122/78', temperature: 37.1, pulse: 76, oxygen: 97, complaints: 'Кашель, слабость', notes: 'Наблюдение' },
  },
];

// Add results after import of engine
export function initializeResults() {
  const { runMCDA } = window.__mcdaEngine || {};
  if (!runMCDA) return;
  patients.forEach(p => {
    if (!p.mcdaResult) {
      p.mcdaResult = runMCDA(p);
    }
  });
}

export function addPatient(patientData) {
  const id = patients.length + 1;
  const newPatient = {
    id,
    ...patientData,
    created_at: new Date().toISOString().slice(0, 10),
    created_by: 1,
    color: avatarColors[(id - 1) % avatarColors.length],
  };
  patients.push(newPatient);
  return newPatient;
}

export function getPatientById(id) {
  return patients.find(p => p.id === parseInt(id));
}
