// ============================================
// SQLite connection and schema bootstrap
// ============================================

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'mcda.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Create all tables from the PDF schema plus UI extensions.
 */
function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      login TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'doctor',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      iin TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      gender TEXT NOT NULL,
      phone TEXT NOT NULL,
      color TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by INTEGER NOT NULL REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS symptoms (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS patient_symptoms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      symptom_id INTEGER NOT NULL REFERENCES symptoms(id),
      severity INTEGER NOT NULL DEFAULT 5,
      UNIQUE(patient_id, symptom_id)
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      blood_pressure TEXT NOT NULL,
      temperature REAL NOT NULL,
      pulse INTEGER NOT NULL,
      oxygen INTEGER NOT NULL,
      complaints TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS criteria (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      weight REAL NOT NULL,
      icon TEXT
    );

    CREATE TABLE IF NOT EXISTS mcda_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      assessment_id INTEGER NOT NULL UNIQUE REFERENCES assessments(id) ON DELETE CASCADE,
      total_score REAL NOT NULL,
      risk_level TEXT NOT NULL,
      possible_diagnosis TEXT,
      recommendation TEXT,
      recommendations TEXT,
      ai_summary TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS criterion_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      result_id INTEGER NOT NULL REFERENCES mcda_results(id) ON DELETE CASCADE,
      criterion_id INTEGER NOT NULL REFERENCES criteria(id),
      score REAL NOT NULL,
      weighted_score REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS patient_recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id INTEGER REFERENCES users(id),
      text TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'human', -- 'ai' or 'human'
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recommendation_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recommendation_id INTEGER NOT NULL REFERENCES patient_recommendations(id) ON DELETE CASCADE,
      doctor_id INTEGER NOT NULL REFERENCES users(id),
      vote_value INTEGER NOT NULL, -- 1 or -1
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(recommendation_id, doctor_id)
    );

    CREATE TABLE IF NOT EXISTS patient_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      extracted_text TEXT,
      extracted_data TEXT,
      is_protocol INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_assessments_patient ON assessments(patient_id);
    CREATE INDEX IF NOT EXISTS idx_mcda_patient ON mcda_results(patient_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_recommendations_patient ON patient_recommendations(patient_id);
  `);

  // Seed Mock Users
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (full_name, email, login, password_hash, role) 
      VALUES (?, ?, ?, ?, ?)
    `);
    insertUser.run('Dr. Smith (Cardiologist)', 'smith@mcda.kz', 'smith', 'hash', 'doctor');
    insertUser.run('Dr. Jones (Surgeon)', 'jones@mcda.kz', 'jones', 'hash', 'doctor');
    insertUser.run('Nurse Kelly', 'kelly@mcda.kz', 'kelly', 'hash', 'nurse');
  }

  // Seed Global Patient (ID 0) for Knowledge Base documents
  const globalPatient = db.prepare('SELECT id FROM patients WHERE id = 0').get();
  if (!globalPatient) {
    db.prepare(`
      INSERT INTO patients (id, full_name, iin, birth_date, gender, phone, color, created_by)
      VALUES (0, 'Knowledge Base', '000000000000', '2000-01-01', 'System', '000', '#222', 1)
    `).run();
  }
  
  // Migration: Add extracted_data to patient_documents if missing
  try {
    const tableInfo = db.prepare('PRAGMA table_info(patient_documents)').all();
    if (!tableInfo.find(c => c.name === 'extracted_data')) {
      db.prepare('ALTER TABLE patient_documents ADD COLUMN extracted_data TEXT').run();
    }
  } catch (err) {
    console.error('Migration extracted_data failed:', err);
  }
}

runMigrations();

export default db;
