// ============================================
// Seed reference data, demo user, and patients
// ============================================

import bcrypt from 'bcryptjs';
import db from './database.js';
import { symptoms, criteria, avatarColors } from '../data/reference.js';
import { createPatientWithAssessment } from '../services/patientService.js';

const seedPatients = [
  {
    full_name: 'Иванов Алексей Петрович', iin: '920514350128',
    birth_date: '1992-05-14', gender: 'М', phone: '+7 701 123 4567',
    symptoms: [1, 3, 4], severities: { 1: 8, 3: 9, 4: 7 },
    assessment: { blood_pressure: '180/110', temperature: 39.2, pulse: 115, oxygen: 88, complaints: 'Сильная одышка, боль в груди при вдохе', notes: 'Поступил экстренно' },
  },
  {
    full_name: 'Сергеева Мария Ивановна', iin: '850923451234',
    birth_date: '1985-09-23', gender: 'Ж', phone: '+7 702 234 5678',
    symptoms: [2, 7], severities: { 2: 4, 7: 3 },
    assessment: { blood_pressure: '125/80', temperature: 37.5, pulse: 82, oxygen: 96, complaints: 'Лёгкий кашель, общая слабость', notes: '' },
  },
  {
    full_name: 'Касымов Нурлан Бериккалиевич', iin: '780312678901',
    birth_date: '1978-03-12', gender: 'М', phone: '+7 705 345 6789',
    symptoms: [1, 4, 10, 12], severities: { 1: 9, 4: 10, 10: 8, 12: 7 },
    assessment: { blood_pressure: '200/130', temperature: 40.1, pulse: 140, oxygen: 82, complaints: 'Потеря сознания, судороги, острая боль в груди', notes: 'КРИТИЧЕСКОЕ СОСТОЯНИЕ' },
  },
  {
    full_name: 'Ахметова Айгуль Тлековна', iin: '950701234567',
    birth_date: '1995-07-01', gender: 'Ж', phone: '+7 707 456 7890',
    symptoms: [5, 6], severities: { 5: 5, 6: 4 },
    assessment: { blood_pressure: '118/75', temperature: 36.8, pulse: 74, oxygen: 98, complaints: 'Головная боль, лёгкая тошнота', notes: 'Стабильное состояние' },
  },
  {
    full_name: 'Петров Дмитрий Сергеевич', iin: '880415567890',
    birth_date: '1988-04-15', gender: 'М', phone: '+7 708 567 8901',
    symptoms: [7], severities: { 7: 2 },
    assessment: { blood_pressure: '120/80', temperature: 36.6, pulse: 70, oxygen: 99, complaints: 'Лёгкая усталость', notes: 'Готов к выписке' },
  },
  {
    full_name: 'Жумабаев Ерлан Канатович', iin: '900228890123',
    birth_date: '1990-02-28', gender: 'М', phone: '+7 700 678 9012',
    symptoms: [1, 3, 8, 11], severities: { 1: 7, 3: 8, 8: 6, 11: 5 },
    assessment: { blood_pressure: '165/100', temperature: 38.8, pulse: 108, oxygen: 90, complaints: 'Одышка, боль в животе, отёки ног', notes: 'Подозрение на сердечную недостаточность' },
  },
  {
    full_name: 'Козлова Елена Андреевна', iin: '000513345678',
    birth_date: '2000-05-13', gender: 'Ж', phone: '+7 771 789 0123',
    symptoms: [2, 5, 9], severities: { 2: 3, 5: 4, 9: 3 },
    assessment: { blood_pressure: '110/70', temperature: 37.2, pulse: 78, oxygen: 97, complaints: 'Кашель, головная боль, головокружение', notes: '' },
  },
  {
    full_name: 'Байтурсынов Аскар Маратович', iin: '750820123456',
    birth_date: '1975-08-20', gender: 'М', phone: '+7 747 890 1234',
    symptoms: [1, 3, 4, 10], severities: { 1: 9, 3: 10, 4: 9, 10: 6 },
    assessment: { blood_pressure: '190/120', temperature: 39.5, pulse: 130, oxygen: 84, complaints: 'Острая боль в груди, тяжёлая одышка', notes: 'Экстренный случай — инфаркт?' },
  },
  {
    full_name: 'Нурланова Дина Серикказы', iin: '980107456789',
    birth_date: '1998-01-07', gender: 'Ж', phone: '+7 778 901 2345',
    symptoms: [6, 8], severities: { 6: 5, 8: 6 },
    assessment: { blood_pressure: '130/85', temperature: 37.0, pulse: 85, oxygen: 96, complaints: 'Тошнота, боль в животе', notes: 'Направить на УЗИ' },
  },
  {
    full_name: 'Смирнов Олег Викторович', iin: '830629789012',
    birth_date: '1983-06-29', gender: 'М', phone: '+7 776 012 3456',
    symptoms: [2, 7, 9], severities: { 2: 3, 7: 4, 9: 2 },
    assessment: { blood_pressure: '122/78', temperature: 37.1, pulse: 76, oxygen: 97, complaints: 'Кашель, слабость', notes: 'Наблюдение' },
  },
];

/**
 * Insert symptoms and criteria reference rows if the tables are empty.
 */
function seedReference() {
  const symCount = db.prepare('SELECT COUNT(*) AS c FROM symptoms').get().c;
  if (symCount === 0) {
    const insertSym = db.prepare('INSERT INTO symptoms (id, name, description) VALUES (?, ?, ?)');
    symptoms.forEach(s => insertSym.run(s.id, s.name, s.description));
  }

  const critCount = db.prepare('SELECT COUNT(*) AS c FROM criteria').get().c;
  if (critCount === 0) {
    const insertCrit = db.prepare('INSERT INTO criteria (id, name, description, weight, icon) VALUES (?, ?, ?, ?, ?)');
    criteria.forEach(c => insertCrit.run(c.id, c.name, c.description, c.weight, c.icon));
  }
}

/**
 * Insert demo admin user if no users exist.
 */
function seedUser() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) return db.prepare('SELECT id FROM users WHERE login = ?').get('admin')?.id;

  const hash = bcrypt.hashSync('admin', 10);
  const result = db.prepare(
    'INSERT INTO users (full_name, email, login, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  ).run('Доктор Асанов К.М.', 'admin@mcda.kz', 'admin', hash, 'doctor');
  return result.lastInsertRowid;
}

/**
 * Seed demo patients with assessments and MCDA results.
 */
function seedPatientsData(userId) {
  const count = db.prepare('SELECT COUNT(*) AS c FROM patients').get().c;
  if (count > 0) return;

  seedPatients.forEach((p, i) => {
    createPatientWithAssessment({
      ...p,
      color: avatarColors[i % avatarColors.length],
      created_by: userId,
    });
  });
}

/**
 * Run full database seed (idempotent).
 */
export function runSeed() {
  seedReference();
  const userId = seedUser();
  if (userId) seedPatientsData(userId);
}

runSeed();
