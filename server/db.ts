import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";
import fs from "fs";

const dataDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let dbPath = path.join(dataDir, "database.db");
if (process.env.SQLITE_PATH) {
  dbPath = process.env.SQLITE_PATH;
} else if (process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith("file:") || process.env.DATABASE_URL.endsWith(".db"))) {
  const raw = process.env.DATABASE_URL;
  dbPath = raw.startsWith("file:") ? raw.replace(/^file:/, "") : raw;
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");
sqlite.pragma("synchronous = NORMAL");
sqlite.pragma("cache_size = -20000");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'assistant',
    permissions TEXT DEFAULT '[]',
    active INTEGER DEFAULT 1,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    age INTEGER,
    gender TEXT,
    address TEXT,
    allergies TEXT,
    chronic_diseases TEXT,
    current_meds TEXT,
    notes TEXT,
    paid_amount INTEGER DEFAULT 0,
    currency_symbol TEXT DEFAULT '₪',
    payments TEXT DEFAULT '[]',
    files TEXT DEFAULT '[]',
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER REFERENCES patients(id),
    patient_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    service TEXT NOT NULL,
    notes TEXT,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled',
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    icon_name TEXT NOT NULL DEFAULT 'MessageCircle',
    message_body TEXT NOT NULL,
    needs_appointment INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL DEFAULT 'Folder',
    color TEXT NOT NULL DEFAULT '#6b7280',
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES expense_categories(id),
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT '₪',
    description TEXT,
    date TEXT NOT NULL,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS daily_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    time TEXT,
    patient_id INTEGER REFERENCES patients(id),
    patient_name TEXT NOT NULL,
    treatment TEXT,
    doctor TEXT,
    amount INTEGER DEFAULT 0,
    currency TEXT DEFAULT '₪',
    notes TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS treatment_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    date TEXT NOT NULL,
    treatment TEXT,
    doctor TEXT,
    notes TEXT NOT NULL,
    daily_entry_id INTEGER REFERENCES daily_entries(id),
    created_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
  CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
  CREATE INDEX IF NOT EXISTS idx_daily_entries_date ON daily_entries(date);
  CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
  CREATE INDEX IF NOT EXISTS idx_treatment_notes_patient ON treatment_notes(patient_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`);

export const db = drizzle(sqlite, { schema });
