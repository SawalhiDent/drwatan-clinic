import { mysqlTable, text, int, timestamp, boolean, json, varchar } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const PERMISSIONS = [
  "appointments",
  "patients_view",
  "patients_edit",
  "payments",
  "reports",
  "files",
  "user_management",
] as const;

export type Permission = typeof PERMISSIONS[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  appointments: "إدارة المواعيد",
  patients_view: "عرض المرضى",
  patients_edit: "تعديل المرضى",
  payments: "المدفوعات",
  reports: "التقارير المالية",
  files: "الملفات والصور",
  user_management: "إدارة المستخدمين",
};

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("assistant"),
  permissions: json("permissions").$type<Permission[]>().default([]),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = mysqlTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
});

export const patients = mysqlTable("patients", {
  id: int("id").primaryKey().autoincrement(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull().unique(),
  age: int("age"),
  gender: varchar("gender", { length: 20 }),
  address: text("address"),
  allergies: text("allergies"),
  chronicDiseases: text("chronic_diseases"),
  currentMeds: text("current_meds"),
  notes: text("notes"),
  paidAmount: int("paid_amount").default(0),
  currencySymbol: varchar("currency_symbol", { length: 10 }).default("₪"),
  payments: json("payments").$type<{
    amount: number;
    date: string;
    method: "cash" | "check";
    checkImageUrl?: string;
    currency: string;
  }[]>().default([]),
  files: json("files").$type<{
    id: string;
    name: string;
    data: string;
    date: string;
  }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointments = mysqlTable("appointments", {
  id: int("id").primaryKey().autoincrement(),
  patientId: int("patient_id").references(() => patients.id),
  patientName: varchar("patient_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  service: varchar("service", { length: 255 }).notNull(),
  notes: text("notes"),
  date: varchar("date", { length: 10 }).notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  status: varchar("status", { length: 20 }).default("scheduled"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const whatsappTemplates = mysqlTable("whatsapp_templates", {
  id: int("id").primaryKey().autoincrement(),
  templateKey: varchar("template_key", { length: 255 }).notNull().unique(),
  label: varchar("label", { length: 255 }).notNull(),
  iconName: varchar("icon_name", { length: 50 }).notNull().default("MessageCircle"),
  messageBody: text("message_body").notNull(),
  needsAppointment: boolean("needs_appointment").default(false),
  sortOrder: int("sort_order").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenseCategories = mysqlTable("expense_categories", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  icon: varchar("icon", { length: 50 }).notNull().default("Folder"),
  color: varchar("color", { length: 20 }).notNull().default("#6b7280"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = mysqlTable("expenses", {
  id: int("id").primaryKey().autoincrement(),
  categoryId: int("category_id").notNull().references(() => expenseCategories.id),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("₪"),
  description: text("description"),
  date: varchar("date", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyEntries = mysqlTable("daily_entries", {
  id: int("id").primaryKey().autoincrement(),
  date: varchar("date", { length: 10 }).notNull(),
  time: varchar("time", { length: 5 }),
  patientId: int("patient_id").references(() => patients.id),
  patientName: varchar("patient_name", { length: 255 }).notNull(),
  treatment: text("treatment"),
  doctor: varchar("doctor", { length: 255 }),
  amount: int("amount").default(0),
  currency: varchar("currency", { length: 10 }).default("₪"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const treatmentNotes = mysqlTable("treatment_notes", {
  id: int("id").primaryKey().autoincrement(),
  patientId: int("patient_id").notNull().references(() => patients.id),
  date: varchar("date", { length: 10 }).notNull(),
  treatment: text("treatment"),
  doctor: varchar("doctor", { length: 255 }),
  notes: text("notes").notNull(),
  dailyEntryId: int("daily_entry_id").references(() => dailyEntries.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schemas
export const insertPatientSchema = createInsertSchema(patients).omit({ 
  id: true, 
  createdAt: true 
});

export const insertAppointmentSchema = createInsertSchema(appointments, {
  phone: z.string().min(9, "رقم الهاتف غير صالح"),
}).omit({ 
  id: true, 
  createdAt: true 
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  passwordHash: true,
}).extend({
  password: z.string().min(4, "كلمة المرور قصيرة جداً"),
});

export const insertWhatsappTemplateSchema = createInsertSchema(whatsappTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

export const insertDailyEntrySchema = createInsertSchema(dailyEntries).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "أدخل اسم المستخدم"),
  password: z.string().min(1, "أدخل كلمة المرور"),
});

// Types
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Session = typeof sessions.$inferSelect;

export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type InsertWhatsappTemplate = z.infer<typeof insertWhatsappTemplateSchema>;

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type DailyEntry = typeof dailyEntries.$inferSelect;
export type InsertDailyEntry = z.infer<typeof insertDailyEntrySchema>;

export type TreatmentNote = typeof treatmentNotes.$inferSelect;
