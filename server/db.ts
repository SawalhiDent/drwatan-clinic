import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

export const db = drizzle(pool, { schema });

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'assistant',
        permissions JSONB DEFAULT '[]',
        active BOOLEAN DEFAULT true,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        expires_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
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
        payments JSONB DEFAULT '[]',
        files JSONB DEFAULT '[]',
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
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
        id SERIAL PRIMARY KEY,
        template_key TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        icon_name TEXT NOT NULL DEFAULT 'MessageCircle',
        message_body TEXT NOT NULL,
        needs_appointment BOOLEAN DEFAULT false,
        sort_order INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS expense_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        icon TEXT NOT NULL DEFAULT 'Folder',
        color TEXT NOT NULL DEFAULT '#6b7280',
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES expense_categories(id),
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT '₪',
        description TEXT,
        date TEXT NOT NULL,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS daily_entries (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        time TEXT,
        patient_id INTEGER REFERENCES patients(id),
        patient_name TEXT NOT NULL,
        treatment TEXT,
        doctor TEXT,
        amount INTEGER DEFAULT 0,
        currency TEXT DEFAULT '₪',
        payment_method TEXT DEFAULT 'cash',
        notes TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS treatment_notes (
        id SERIAL PRIMARY KEY,
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

      ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS salary INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_rate INTEGER DEFAULT 0;
    `);
    console.log("Database tables initialized successfully");
  } finally {
    client.release();
  }
}
