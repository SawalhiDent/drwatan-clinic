import { db } from "./db";
import {
  patients,
  appointments,
  users,
  sessions,
  whatsappTemplates,
  expenseCategories,
  expenses,
  dailyEntries,
  treatmentNotes,
  type InsertPatient,
  type InsertAppointment,
  type InsertWhatsappTemplate,
  type InsertExpenseCategory,
  type InsertExpense,
  type InsertDailyEntry,
  type Patient,
  type Appointment,
  type User,
  type Session,
  type Permission,
  type WhatsappTemplate,
  type ExpenseCategory,
  type Expense,
  type DailyEntry,
  type TreatmentNote,
} from "@shared/schema";
import { eq, and, sql, desc, asc, gte, lte } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";

class MemoryCache<T> {
  private cache = new Map<string, { data: T; expiresAt: number }>();
  private ttlMs: number;

  constructor(ttlSeconds: number) {
    this.ttlMs = ttlSeconds * 1000;
  }

  get(key: string): { hit: true; data: T } | { hit: false } {
    const entry = this.cache.get(key);
    if (!entry) return { hit: false };
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return { hit: false };
    }
    return { hit: true, data: entry.data };
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, expiresAt: Date.now() + this.ttlMs });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}

const sessionCache = new MemoryCache<(Session & { user: User }) | undefined>(60);
const templatesCache = new MemoryCache<WhatsappTemplate[]>(300);
const categoriesCache = new MemoryCache<ExpenseCategory[]>(300);

export interface IStorage {
  // Patients
  getPatients(search?: string): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientByPhone(phone: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient>;

  // Appointments
  getAppointments(date?: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: number): Promise<void>;
  checkAvailability(date: string, startTime: string): Promise<boolean>;
  checkSlotsAvailability(date: string, slots: string[]): Promise<string | null>;

  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(data: { username: string; password: string; displayName: string; role: string; permissions: Permission[]; phone?: string; salary?: number; commissionRate?: number }): Promise<User>;
  updateUser(id: number, data: { displayName?: string; role?: string; permissions?: Permission[]; active?: boolean; password?: string; phone?: string; salary?: number; commissionRate?: number }): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;
  verifyPassword(user: User, password: string): Promise<boolean>;

  // Sessions
  createSession(userId: number): Promise<Session>;
  getSession(id: string): Promise<(Session & { user: User }) | undefined>;
  deleteSession(id: string): Promise<void>;
  cleanExpiredSessions(): Promise<void>;

  // WhatsApp Templates
  getWhatsappTemplates(): Promise<WhatsappTemplate[]>;
  getWhatsappTemplate(id: number): Promise<WhatsappTemplate | undefined>;
  createWhatsappTemplate(data: InsertWhatsappTemplate): Promise<WhatsappTemplate>;
  updateWhatsappTemplate(id: number, data: Partial<InsertWhatsappTemplate>): Promise<WhatsappTemplate | undefined>;
  deleteWhatsappTemplate(id: number): Promise<void>;
  seedDefaultTemplates(): Promise<void>;

  // Expense Categories
  getExpenseCategories(): Promise<ExpenseCategory[]>;
  createExpenseCategory(data: InsertExpenseCategory): Promise<ExpenseCategory>;
  updateExpenseCategory(id: number, data: Partial<InsertExpenseCategory>): Promise<ExpenseCategory | undefined>;
  deleteExpenseCategory(id: number): Promise<void>;
  seedDefaultExpenseCategories(): Promise<void>;

  // Expenses
  getExpenses(startDate?: string, endDate?: string): Promise<Expense[]>;
  createExpense(data: InsertExpense): Promise<Expense>;
  updateExpense(id: number, data: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<void>;

  // Daily Entries
  getDailyEntries(date?: string): Promise<DailyEntry[]>;
  getDailyEntriesByRange(from: string, to: string): Promise<DailyEntry[]>;
  getDailyEntry(id: number): Promise<DailyEntry | undefined>;
  createDailyEntry(data: InsertDailyEntry): Promise<DailyEntry>;
  updateDailyEntry(id: number, data: Partial<InsertDailyEntry>): Promise<DailyEntry | undefined>;
  deleteDailyEntry(id: number): Promise<void>;

  // Treatment Notes
  getTreatmentNotes(patientId: number): Promise<TreatmentNote[]>;
  createTreatmentNote(data: { patientId: number; date: string; treatment?: string | null; doctor?: string | null; notes: string; dailyEntryId?: number | null }): Promise<TreatmentNote>;
}

export class DatabaseStorage implements IStorage {
  // Patients
  async getPatients(search?: string): Promise<Patient[]> {
    if (search) {
      const lowerSearch = `%${search.toLowerCase()}%`;
      return await db.select().from(patients).where(
        sql`lower(${patients.fullName}) LIKE ${lowerSearch} OR ${patients.phone} LIKE ${lowerSearch}`
      ).orderBy(desc(patients.createdAt));
    }
    return await db.select().from(patients).orderBy(desc(patients.createdAt));
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async getPatientByPhone(phone: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.phone, phone));
    return patient;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [newPatient] = await db.insert(patients).values(patient as any).returning();
    return newPatient;
  }

  async updatePatient(id: number, updates: Partial<InsertPatient>): Promise<Patient> {
    const [updated] = await db.update(patients).set(updates as any).where(eq(patients.id, id)).returning();
    return updated;
  }

  // Appointments
  async getAppointments(date?: string): Promise<Appointment[]> {
    if (date) {
      return await db.select().from(appointments)
        .where(eq(appointments.date, date))
        .orderBy(asc(appointments.startTime));
    }
    return await db.select().from(appointments).orderBy(desc(appointments.date), asc(appointments.startTime));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    return newAppointment;
  }

  async updateAppointment(id: number, updates: Partial<InsertAppointment>): Promise<Appointment> {
    const [updated] = await db.update(appointments).set(updates).where(eq(appointments.id, id)).returning();
    return updated;
  }

  async deleteAppointment(id: number): Promise<void> {
    await db.delete(appointments).where(eq(appointments.id, id));
  }

  async checkAvailability(date: string, slotTime: string): Promise<boolean> {
    const result = await this.checkSlotsAvailability(date, [slotTime]);
    return result === null;
  }

  async checkSlotsAvailability(date: string, slots: string[]): Promise<string | null> {
    const dayAppointments = await db.select({
      startTime: appointments.startTime,
      endTime: appointments.endTime,
    }).from(appointments).where(
      and(
        eq(appointments.date, date),
        sql`${appointments.status} != 'cancelled'`
      )
    );
    for (const slotTime of slots) {
      const slotMin = parseInt(slotTime.split(":")[0]) * 60 + parseInt(slotTime.split(":")[1]);
      const conflict = dayAppointments.some(apt => {
        const startMin = parseInt(apt.startTime.split(":")[0]) * 60 + parseInt(apt.startTime.split(":")[1]);
        const endMin = parseInt(apt.endTime.split(":")[0]) * 60 + parseInt(apt.endTime.split(":")[1]);
        return slotMin >= startMin && slotMin < endMin;
      });
      if (conflict) return slotTime;
    }
    return null;
  }

  // Users
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(data: { username: string; password: string; displayName: string; role: string; permissions: Permission[]; phone?: string; salary?: number; commissionRate?: number }): Promise<User> {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const [user] = await db.insert(users).values({
      username: data.username,
      passwordHash,
      displayName: data.displayName,
      role: data.role,
      permissions: data.permissions,
      phone: data.phone || null,
      salary: data.salary || 0,
      commissionRate: data.commissionRate || 0,
    }).returning();
    return user;
  }

  async updateUser(id: number, data: { displayName?: string; role?: string; permissions?: Permission[]; active?: boolean; password?: string; phone?: string; salary?: number; commissionRate?: number }): Promise<User | undefined> {
    const updates: any = {};
    if (data.displayName !== undefined) updates.displayName = data.displayName;
    if (data.role !== undefined) updates.role = data.role;
    if (data.permissions !== undefined) updates.permissions = data.permissions;
    if (data.active !== undefined) updates.active = data.active;
    if (data.password) updates.passwordHash = await bcrypt.hash(data.password, 10);
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.salary !== undefined) updates.salary = data.salary;
    if (data.commissionRate !== undefined) updates.commissionRate = data.commissionRate;

    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  // Sessions
  async createSession(userId: number): Promise<Session> {
    const id = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const [session] = await db.insert(sessions).values({ id, userId, expiresAt }).returning();
    return session;
  }

  async getSession(id: string): Promise<(Session & { user: User }) | undefined> {
    const cached = sessionCache.get(id);
    if (cached.hit) return cached.data;

    const results = await db
      .select()
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, id));

    if (results.length === 0) {
      sessionCache.set(id, undefined);
      return undefined;
    }

    const row = results[0];
    if (new Date().toISOString() > row.sessions.expiresAt) {
      await this.deleteSession(id);
      return undefined;
    }

    const result = { ...row.sessions, user: row.users };
    sessionCache.set(id, result);
    return result;
  }

  async deleteSession(id: string): Promise<void> {
    sessionCache.invalidate(id);
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async cleanExpiredSessions(): Promise<void> {
    sessionCache.invalidateAll();
    const now = new Date().toISOString();
    await db.delete(sessions).where(sql`${sessions.expiresAt} < ${now}`);
  }

  // WhatsApp Templates
  async getWhatsappTemplates(): Promise<WhatsappTemplate[]> {
    const cached = templatesCache.get("all");
    if (cached.hit) return cached.data;
    const result = await db.select().from(whatsappTemplates)
      .where(eq(whatsappTemplates.active, true))
      .orderBy(asc(whatsappTemplates.sortOrder));
    templatesCache.set("all", result);
    return result;
  }

  async getWhatsappTemplate(id: number): Promise<WhatsappTemplate | undefined> {
    const [t] = await db.select().from(whatsappTemplates).where(eq(whatsappTemplates.id, id));
    return t;
  }

  async createWhatsappTemplate(data: InsertWhatsappTemplate): Promise<WhatsappTemplate> {
    templatesCache.invalidateAll();
    const [t] = await db.insert(whatsappTemplates).values(data).returning();
    return t;
  }

  async updateWhatsappTemplate(id: number, data: Partial<InsertWhatsappTemplate>): Promise<WhatsappTemplate | undefined> {
    templatesCache.invalidateAll();
    const [t] = await db.update(whatsappTemplates).set(data).where(eq(whatsappTemplates.id, id)).returning();
    return t;
  }

  async deleteWhatsappTemplate(id: number): Promise<void> {
    templatesCache.invalidateAll();
    await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, id));
  }

  async seedDefaultTemplates(): Promise<void> {
    const existing = await db.select().from(whatsappTemplates);
    if (existing.length > 0) return;

    const defaults: InsertWhatsappTemplate[] = [
      {
        templateKey: "reminder",
        label: "تذكير بموعد",
        iconName: "Clock",
        needsAppointment: true,
        sortOrder: 1,
        messageBody: `السلام عليكم {name}،\nنذكرك بموعدك في عيادة *صوالحي دنت*\nالتاريخ: {date}\nالساعة: {time}\nالخدمة: {service}\n\nنرجو الحضور في الموعد المحدد.\nنتمنى لك دوام الصحة والعافية.`,
      },
      {
        templateKey: "invoice",
        label: "إرسال فاتورة",
        iconName: "Receipt",
        needsAppointment: false,
        sortOrder: 2,
        messageBody: `السلام عليكم {name}،\nفاتورة من عيادة *صوالحي دنت*\n━━━━━━━━━━━━━━━\n{payments_list}\n━━━━━━━━━━━━━━━\nالمبلغ الإجمالي المدفوع: *{total_paid} {currency}*\n\nشكراً لثقتكم بعيادة صوالحي دنت.`,
      },
      {
        templateKey: "extraction",
        label: "تعليمات بعد الخلع",
        iconName: "Syringe",
        needsAppointment: false,
        sortOrder: 3,
        messageBody: `السلام عليكم {name}،\nتعليمات مهمة بعد *خلع السن* من عيادة صوالحي دنت:\n\n1- العض على الشاش لمدة *ساعة كاملة* وعدم إزالته.\n2- *تجنب* المشروبات والأطعمة الساخنة لمدة 24 ساعة.\n3- *عدم المضمضة* بقوة في نفس اليوم.\n4- *عدم استخدام* القشة (الشلمون) للشرب.\n5- تجنب التدخين لمدة *48 ساعة* على الأقل.\n6- وضع *كمادات باردة* على الخد من الخارج (20 دقيقة تشغيل / 20 دقيقة إيقاف).\n7- تناول الأدوية الموصوفة *بانتظام*.\n8- تناول أطعمة *لينة وباردة* في اليوم الأول.\n9- النوم مع *رفع الرأس* قليلاً.\n\nفي حال استمرار النزيف أو حدوث ألم شديد، تواصل معنا فوراً.\nنتمنى لك الشفاء العاجل.`,
      },
      {
        templateKey: "implant",
        label: "تعليمات بعد الزراعة",
        iconName: "Wrench",
        needsAppointment: false,
        sortOrder: 4,
        messageBody: `السلام عليكم {name}،\nتعليمات مهمة بعد *زراعة الأسنان* من عيادة صوالحي دنت:\n\n1- وضع *كمادات باردة* على الخد (20 دقيقة تشغيل / 20 دقيقة إيقاف) خلال أول 48 ساعة.\n2- الالتزام بالأدوية الموصوفة (*المضاد الحيوي + مسكن الألم*).\n3- تناول أطعمة *لينة فقط* لمدة أسبوع.\n4- *تجنب المضغ* على منطقة الزراعة.\n5- تنظيف الأسنان *بلطف شديد* وتجنب منطقة الزراعة.\n6- *تجنب التدخين* تماماً لمدة أسبوعين على الأقل.\n7- *عدم ممارسة* الرياضة الشاقة لمدة أسبوع.\n8- استخدام *غسول الفم* الموصوف بعد 24 ساعة من العملية.\n9- الحضور لموعد *المتابعة* بعد أسبوع.\n\nفي حال حدوث تورم شديد أو نزيف مستمر أو ارتفاع في الحرارة، تواصل معنا فوراً.\nنتمنى لك الشفاء العاجل.`,
      },
      {
        templateKey: "filling",
        label: "تعليمات بعد الحشوة",
        iconName: "Sparkles",
        needsAppointment: false,
        sortOrder: 5,
        messageBody: `السلام عليكم {name}،\nتعليمات بعد *حشوة الأسنان* من عيادة صوالحي دنت:\n\n1- *تجنب الأكل والشرب* لمدة ساعتين بعد الحشوة.\n2- تجنب الأطعمة *القاسية والصلبة* لمدة 24 ساعة.\n3- إذا شعرت بأن *الإطباق مرتفع*، راجعنا لتعديله.\n4- من الطبيعي الشعور بـ *حساسية خفيفة* لبضعة أيام.\n5- استمر في تنظيف أسنانك *بشكل طبيعي*.\n\nنتمنى لك دوام الصحة.`,
      },
      {
        templateKey: "scaling",
        label: "تعليمات بعد التنظيف",
        iconName: "Brush",
        needsAppointment: false,
        sortOrder: 6,
        messageBody: `السلام عليكم {name}،\nتعليمات بعد *تنظيف الأسنان* من عيادة صوالحي دنت:\n\n1- تجنب الأطعمة والمشروبات *الملونة* (شاي، قهوة، كولا) لمدة 48 ساعة.\n2- من الطبيعي حدوث *حساسية خفيفة* في اللثة لبضعة أيام.\n3- استخدم فرشاة أسنان *ناعمة* ومعجون أسنان *للحساسية*.\n4- استخدم *خيط الأسنان* يومياً.\n5- يُنصح بإجراء تنظيف *كل 6 أشهر*.\n\nنتمنى لك دوام الصحة.`,
      },
      {
        templateKey: "general",
        label: "رسالة عامة",
        iconName: "MessageCircle",
        needsAppointment: false,
        sortOrder: 7,
        messageBody: `السلام عليكم {name}،\nمعك عيادة *صوالحي دنت*\nكيف يمكننا مساعدتك اليوم؟\nنتمنى لك دوام الصحة والعافية.`,
      },
    ];

    await db.insert(whatsappTemplates).values(defaults);
  }

  // Expense Categories
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    const cached = categoriesCache.get("all");
    if (cached.hit) return cached.data;
    const result = await db.select().from(expenseCategories).orderBy(asc(expenseCategories.name));
    categoriesCache.set("all", result);
    return result;
  }

  async createExpenseCategory(data: InsertExpenseCategory): Promise<ExpenseCategory> {
    categoriesCache.invalidateAll();
    const [cat] = await db.insert(expenseCategories).values(data).returning();
    return cat;
  }

  async updateExpenseCategory(id: number, data: Partial<InsertExpenseCategory>): Promise<ExpenseCategory | undefined> {
    categoriesCache.invalidateAll();
    const [cat] = await db.update(expenseCategories).set(data).where(eq(expenseCategories.id, id)).returning();
    return cat;
  }

  async deleteExpenseCategory(id: number): Promise<void> {
    categoriesCache.invalidateAll();
    await db.delete(expenses).where(eq(expenses.categoryId, id));
    await db.delete(expenseCategories).where(eq(expenseCategories.id, id));
  }

  async seedDefaultExpenseCategories(): Promise<void> {
    const existing = await db.select().from(expenseCategories);
    if (existing.length > 0) return;

    const defaults: InsertExpenseCategory[] = [
      { name: "المختبر", icon: "FlaskConical", color: "#8b5cf6" },
      { name: "الأدوات والمواد", icon: "Wrench", color: "#f59e0b" },
      { name: "الإيجار", icon: "Building2", color: "#3b82f6" },
      { name: "الكهرباء والماء", icon: "Zap", color: "#eab308" },
      { name: "الرواتب", icon: "Users", color: "#10b981" },
      { name: "الصيانة", icon: "Settings", color: "#6b7280" },
    ];

    await db.insert(expenseCategories).values(defaults);
  }

  // Expenses
  async getExpenses(startDate?: string, endDate?: string): Promise<Expense[]> {
    if (startDate && endDate) {
      return await db.select().from(expenses)
        .where(and(
          sql`${expenses.date} >= ${startDate}`,
          sql`${expenses.date} <= ${endDate}`
        ))
        .orderBy(desc(expenses.date));
    }
    return await db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async createExpense(data: InsertExpense): Promise<Expense> {
    const [exp] = await db.insert(expenses).values(data).returning();
    return exp;
  }

  async updateExpense(id: number, data: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [exp] = await db.update(expenses).set(data).where(eq(expenses.id, id)).returning();
    return exp;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  // Daily Entries
  async getDailyEntries(date?: string): Promise<DailyEntry[]> {
    if (date) {
      return await db.select().from(dailyEntries)
        .where(eq(dailyEntries.date, date))
        .orderBy(asc(dailyEntries.time));
    }
    return await db.select().from(dailyEntries).orderBy(desc(dailyEntries.date), asc(dailyEntries.time));
  }

  async getDailyEntriesByRange(from: string, to: string): Promise<DailyEntry[]> {
    return await db.select().from(dailyEntries)
      .where(and(gte(dailyEntries.date, from), lte(dailyEntries.date, to)))
      .orderBy(asc(dailyEntries.date), asc(dailyEntries.time));
  }

  async getDailyEntry(id: number): Promise<DailyEntry | undefined> {
    const [entry] = await db.select().from(dailyEntries).where(eq(dailyEntries.id, id));
    return entry;
  }

  async createDailyEntry(data: InsertDailyEntry): Promise<DailyEntry> {
    const [entry] = await db.insert(dailyEntries).values(data).returning();
    return entry;
  }

  async updateDailyEntry(id: number, data: Partial<InsertDailyEntry>): Promise<DailyEntry | undefined> {
    const [entry] = await db.update(dailyEntries).set(data).where(eq(dailyEntries.id, id)).returning();
    return entry;
  }

  async deleteDailyEntry(id: number): Promise<void> {
    await db.update(treatmentNotes).set({ dailyEntryId: null }).where(eq(treatmentNotes.dailyEntryId, id));
    await db.delete(dailyEntries).where(eq(dailyEntries.id, id));
  }

  // Treatment Notes
  async getTreatmentNotes(patientId: number): Promise<TreatmentNote[]> {
    return await db.select().from(treatmentNotes)
      .where(eq(treatmentNotes.patientId, patientId))
      .orderBy(desc(treatmentNotes.date), desc(treatmentNotes.createdAt));
  }

  async createTreatmentNote(data: { patientId: number; date: string; treatment?: string | null; doctor?: string | null; notes: string; dailyEntryId?: number | null }): Promise<TreatmentNote> {
    const [note] = await db.insert(treatmentNotes).values({
      patientId: data.patientId,
      date: data.date,
      treatment: data.treatment || null,
      doctor: data.doctor || null,
      notes: data.notes,
      dailyEntryId: data.dailyEntryId || null,
    }).returning();
    return note;
  }
}

export const storage = new DatabaseStorage();
