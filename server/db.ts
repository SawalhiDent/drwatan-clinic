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
        settlement_id INTEGER,
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

      CREATE TABLE IF NOT EXISTS doctor_settlements (
        id SERIAL PRIMARY KEY,
        doctor_name TEXT NOT NULL,
        period_from TEXT NOT NULL,
        period_to TEXT NOT NULL,
        period_type TEXT NOT NULL DEFAULT 'weekly',
        total_revenue INTEGER DEFAULT 0,
        commission INTEGER DEFAULT 0,
        salary INTEGER DEFAULT 0,
        total_due INTEGER DEFAULT 0,
        amount_paid INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT '₪',
        notes TEXT,
        created_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_doctor_settlements_doctor ON doctor_settlements(doctor_name);
      CREATE INDEX IF NOT EXISTS idx_doctor_settlements_period ON doctor_settlements(period_from, period_to);

      ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
      ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS check_images TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS salary INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_rate INTEGER DEFAULT 0;
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS settlement_id INTEGER;
      ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'ar';
      ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'dental';

      -- Update existing templates: add دكتورة وطن to clinic name
      UPDATE whatsapp_templates SET message_body = REPLACE(message_body, 'عيادة *صوالحي دنت*', 'عيادة *صوالحي دنت - دكتورة وطن*') WHERE message_body LIKE '%عيادة *صوالحي دنت*%';
      UPDATE whatsapp_templates SET message_body = REPLACE(message_body, 'عيادة صوالحي دنت', 'عيادة صوالحي دنت - دكتورة وطن') WHERE message_body LIKE '%عيادة صوالحي دنت%' AND message_body NOT LIKE '%دكتورة وطن%';

      -- Set category for existing general template
      UPDATE whatsapp_templates SET category = 'general' WHERE template_key = 'general';
      UPDATE whatsapp_templates SET category = 'general' WHERE template_key = 'invoice';
      UPDATE whatsapp_templates SET category = 'general' WHERE template_key = 'reminder';

      -- Insert Hebrew templates (ON CONFLICT DO NOTHING uses unique template_key)
      INSERT INTO whatsapp_templates (template_key, label, icon_name, message_body, needs_appointment, sort_order, language, category) VALUES
      ('reminder_he', 'תזכורת לפגישה', 'Clock', E'שלום {name},\nתזכורת לפגישתך בקליניקה *Sawalhi Dent - Dr. Watan*\nתאריך: {date}\nשעה: {time}\nשירות: {service}\n\nנבקשך להגיע בזמן.\nבריאות וחיים טובים.', true, 11, 'he', 'dental'),
      ('invoice_he', 'שליחת חשבונית', 'Receipt', E'שלום {name},\nחשבונית מקליניקה *Sawalhi Dent - Dr. Watan*\n━━━━━━━━━━━━━━━\n{payments_list}\n━━━━━━━━━━━━━━━\nסה"כ שולם: *{total_paid} {currency}*\n\nתודה על אמונכם בנו.', false, 12, 'he', 'general'),
      ('extraction_he', 'הוראות לאחר עקירה', 'Syringe', E'שלום {name},\nהוראות חשובות לאחר *עקירת שן* מקליניקה Sawalhi Dent:\n\n1- נשוך על הגזה במשך *שעה שלמה*.\n2- *הימנע* ממשקאות ומזון חמים ל-24 שעות.\n3- *אין לשטוף* את הפה בכוח באותו יום.\n4- *אין להשתמש* בקשית לשתייה.\n5- הימנע מעישון *48 שעות* לפחות.\n6- שים *קרח* על הלחי מבחוץ (20 דקות הפעלה / 20 דקות כיבוי).\n7- קח את התרופות שנרשמו *באופן סדיר*.\n8- אכול מזון *רך וקר* ביום הראשון.\n\nבמקרה של דימום ממושך או כאב עז - צור איתנו קשר.\nרפואה שלמה!', false, 13, 'he', 'dental'),
      ('implant_he', 'הוראות לאחר שתל', 'Wrench', E'שלום {name},\nהוראות לאחר *שתל שיניים* מקליניקה Sawalhi Dent:\n\n1- שים *קרח* על הלחי (20 דקות הפעלה / 20 דקות כיבוי) ב-48 השעות הראשונות.\n2- קח את התרופות שנרשמו (*אנטיביוטיקה + משכך כאבים*).\n3- אכול *מזון רך בלבד* במשך שבוע.\n4- *הימנע מלעיסה* באזור השתל.\n5- צחצח שיניים *בעדינות* והימנע מאזור השתל.\n6- *אין לעשן* שבועיים לפחות.\n7- *אין לעסוק* בפעילות ספורטיבית כבדה שבוע.\n8- השתמש ב*שטיפת פה* שנרשמה לאחר 24 שעות.\n9- בוא לביקורת *מעקב* לאחר שבוע.\n\nבריאות שלמה!', false, 14, 'he', 'dental'),
      ('filling_he', 'הוראות לאחר סתימה', 'Sparkles', E'שלום {name},\nהוראות לאחר *סתימת שן* מקליניקה Sawalhi Dent:\n\n1- *אין לאכול או לשתות* שעתיים לאחר הסתימה.\n2- הימנע ממזון *קשה* ל-24 שעות.\n3- אם ה*עקיצה גבוהה*, בוא לכוונון.\n4- תרגיש *רגישות קלה* מספר ימים - זה תקין.\n5- המשך לצחצח שיניים *כרגיל*.\n\nבריאות!', false, 15, 'he', 'dental'),
      ('scaling_he', 'הוראות לאחר ניקוי', 'Brush', E'שלום {name},\nהוראות לאחר *ניקוי שיניים* מקליניקה Sawalhi Dent:\n\n1- הימנע ממזון ומשקאות *מגוונים* (תה, קפה, קולה) ל-48 שעות.\n2- רגישות קלה בחניכיים מספר ימים - *תקין*.\n3- השתמש ב*מברשת רכה* ומשחת שיניים *לרגישות*.\n4- השתמש ב*חוט דנטלי* יומיום.\n5- מומלץ ניקוי *כל 6 חודשים*.\n\nבריאות!', false, 16, 'he', 'dental'),
      ('general_he', 'הודעה כללית', 'MessageCircle', E'שלום {name},\nכאן קליניקה *Sawalhi Dent - Dr. Watan*\nכיצד נוכל לעזור לך היום?\nבריאות וחיים טובים.', false, 17, 'he', 'general'),
      ('aesthetic_reminder', 'تذكير موعد تجميل', 'Clock', E'السلام عليكم {name}،\nنذكرك بموعدك في عيادة *صوالحي دنت - دكتورة وطن* ✨\nالتاريخ: {date}\nالساعة: {time}\nالخدمة: {service}\n\nنرجو الحضور في الموعد المحدد.\nنتمنى لك دوام الصحة والجمال.', true, 21, 'ar', 'aesthetic'),
      ('botox_instructions', 'تعليمات بعد البوتوكس', 'Sparkles', E'السلام عليكم {name}،\nتعليمات مهمة بعد جلسة *البوتوكس* في عيادة صوالحي دنت - دكتورة وطن:\n\n1- *لا تلمس* منطقة الحقن لمدة 24 ساعة.\n2- *ابتعد عن الحرارة* (ساونا، حمامات ساخنة) 48 ساعة.\n3- *تجنب الانحناء للأمام* أو وضع الرأس لأسفل لمدة 4 ساعات.\n4- *لا تمارس رياضة شاقة* ليوم كامل.\n5- *لا تضغط أو تدلك* المنطقة المحقونة.\n6- من الطبيعي ظهور *احمرار خفيف* يزول خلال ساعات.\n7- النتيجة تظهر خلال *3-7 أيام* وتكتمل بعد أسبوعين.\n\nنتمنى لك نتيجة رائعة! ✨', false, 22, 'ar', 'aesthetic'),
      ('filler_instructions', 'تعليمات بعد الفيلر', 'Sparkles', E'السلام عليكم {name}،\nتعليمات بعد جلسة *الفيلر* في عيادة صوالحي دنت - دكتورة وطن:\n\n1- *تجنب اللمس أو الضغط* على المنطقة لمدة 24 ساعة.\n2- *ابتعد عن الحرارة الشديدة* (شمس، ساونا) أسبوع.\n3- من الطبيعي *التورم والكدمات* لبضعة أيام.\n4- *ضع كمادات باردة* للتخفيف من التورم.\n5- *تجنب مستحضرات التجميل* 12 ساعة على الأقل.\n6- النتيجة النهائية تظهر بعد *2-4 أسابيع*.\n7- *لا تمارس رياضة شاقة* 48 ساعة.\n\nنتمنى لك نتيجة مذهلة! ✨', false, 23, 'ar', 'aesthetic'),
      ('laser_instructions', 'تعليمات بعد الليزر', 'Sparkles', E'السلام عليكم {name}،\nتعليمات بعد جلسة *الليزر* في عيادة صوالحي دنت - دكتورة وطن:\n\n1- *ضع واقي الشمس* (SPF 50+) باستمرار لأسبوعين.\n2- *تجنب أشعة الشمس المباشرة* أسبوعين على الأقل.\n3- *رطّب البشرة* بكريم مرطب لطيف يومياً.\n4- *تجنب الساونا* والحمامات الساخنة أسبوع.\n5- من الطبيعي *الاحمرار والتقشير* لبضعة أيام.\n6- *لا تقشّر البشرة* يدوياً، دعها تتقشر طبيعياً.\n7- *تجنب مكياج* على المنطقة المعالجة 48 ساعة.\n\nنتمنى لك بشرة مشرقة! ✨', false, 24, 'ar', 'aesthetic'),
      ('skincare_instructions', 'تعليمات بعد نضارة البشرة', 'Sparkles', E'السلام عليكم {name}،\nتعليمات بعد جلسة *نضارة البشرة* في عيادة صوالحي دنت - دكتورة وطن:\n\n1- *رطّب بشرتك* بمرطب لطيف 3 مرات يومياً.\n2- *اشرب ماءً* بكميات وفيرة.\n3- *تجنب المكياج* لمدة 24 ساعة.\n4- *تجنب الشمس* واستخدم واقي الشمس.\n5- *لا تلمس وجهك* بيدين غير نظيفتين.\n6- النتيجة تستمر في التحسن خلال *الأسابيع القادمة*.\n\nنتمنى لك بشرة متألقة! ✨', false, 25, 'ar', 'aesthetic'),
      ('aesthetic_reminder_he', 'תזכורת לטיפול אסתטי', 'Clock', E'שלום {name},\nתזכורת לטיפולך בקליניקה *Sawalhi Dent - Dr. Watan* ✨\nתאריך: {date}\nשעה: {time}\nטיפול: {service}\n\nנבקשך להגיע בזמן.\nיופי ובריאות!', true, 31, 'he', 'aesthetic'),
      ('botox_instructions_he', 'הוראות לאחר בוטוקס', 'Sparkles', E'שלום {name},\nהוראות לאחר *בוטוקס* בקליניקה Sawalhi Dent - Dr. Watan:\n\n1- *אין לגעת* באזור ההזרקה 24 שעות.\n2- *הימנע מחום* (סאונה, אמבטיה חמה) 48 שעות.\n3- *אין לכופף* את הראש למטה 4 שעות.\n4- *אין לעסוק בספורט* כבד יום שלם.\n5- *אין ללחוץ* על האזור המוזרק.\n6- אדמומיות קלה תיעלם תוך שעות - *תקין*.\n7- התוצאה תופיע תוך *3-7 ימים* ותושלם לאחר שבועיים.\n\nיופי מושלם! ✨', false, 32, 'he', 'aesthetic'),
      ('filler_instructions_he', 'הוראות לאחר פילר', 'Sparkles', E'שלום {name},\nהוראות לאחר *פילר* בקליניקה Sawalhi Dent - Dr. Watan:\n\n1- *אין לגעת* באזור 24 שעות.\n2- *הימנע מחום קיצוני* שבוע.\n3- נפיחות וחבורות *תקינות* לכמה ימים.\n4- שים *קרח* להפחתת הנפיחות.\n5- *אין להשתמש* בקוסמטיקה 12 שעות.\n6- התוצאה הסופית תופיע לאחר *2-4 שבועות*.\n\nיופי! ✨', false, 33, 'he', 'aesthetic'),
      ('laser_instructions_he', 'הוראות לאחר לייזר', 'Sparkles', E'שלום {name},\nהוראות לאחר *לייזר* בקליניקה Sawalhi Dent - Dr. Watan:\n\n1- *השתמש בקרם הגנה* (SPF 50+) שבועיים.\n2- *הימנע משמש ישיר* שבועיים לפחות.\n3- *לחלח* את העור מדי יום.\n4- *הימנע מסאונה* ואמבטיה חמה שבוע.\n5- אדמומיות וקילוף *תקינים* כמה ימים.\n6- *אין לקלף* ידנית - תן לעור להתקלף לבד.\n\nעור זוהר! ✨', false, 34, 'he', 'aesthetic')
      ON CONFLICT (template_key) DO NOTHING;
    `);
    console.log("Database tables initialized successfully");
  } finally {
    client.release();
  }
}
