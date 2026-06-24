import { pgTable, text, integer, serial, boolean, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("assistant"),
  permissions: jsonb("permissions").$type<Permission[]>().default([]),
  phone: text("phone"),
  salary: integer("salary").default(0),
  commissionRate: integer("commission_rate").default(0),
  showInBooking: boolean("show_in_booking").default(true),
  active: boolean("active").default(true),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull().unique(),
  age: integer("age"),
  gender: text("gender"),
  address: text("address"),
  allergies: text("allergies"),
  chronicDiseases: text("chronic_diseases"),
  currentMeds: text("current_meds"),
  notes: text("notes"),
  fileNumber: text("file_number"),
  paidAmount: integer("paid_amount").default(0),
  currencySymbol: text("currency_symbol").default("₪"),
  payments: jsonb("payments").$type<{
    amount: number;
    date: string;
    method: "cash" | "check";
    checkImageUrl?: string;
    currency: string;
    dailyEntryId?: number;
  }[]>().default([]),
  files: jsonb("files").$type<{
    id: string;
    name: string;
    data: string;
    date: string;
  }[]>().default([]),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  patientName: text("patient_name").notNull(),
  phone: text("phone").notNull(),
  service: text("service").notNull(),
  notes: text("notes"),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  status: text("status").default("scheduled"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: serial("id").primaryKey(),
  templateKey: text("template_key").notNull().unique(),
  label: text("label").notNull(),
  iconName: text("icon_name").notNull().default("MessageCircle"),
  messageBody: text("message_body").notNull(),
  needsAppointment: boolean("needs_appointment").default(false),
  sortOrder: integer("sort_order").default(0),
  active: boolean("active").default(true),
  language: text("language").default("ar"),
  category: text("category").default("dental"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  icon: text("icon").notNull().default("Folder"),
  color: text("color").notNull().default("#6b7280"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => expenseCategories.id),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("₪"),
  description: text("description"),
  date: text("date").notNull(),
  settlementId: integer("settlement_id"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const dailyEntries = pgTable("daily_entries", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  time: text("time"),
  patientId: integer("patient_id").references(() => patients.id),
  patientName: text("patient_name").notNull(),
  treatment: text("treatment"),
  doctor: text("doctor"),
  amount: integer("amount").default(0),
  currency: text("currency").default("₪"),
  paymentMethod: text("payment_method").default("cash"),
  checkImages: text("check_images"),
  notes: text("notes"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const treatmentNotes = pgTable("treatment_notes", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  date: text("date").notNull(),
  treatment: text("treatment"),
  doctor: text("doctor"),
  notes: text("notes").notNull(),
  dailyEntryId: integer("daily_entry_id").references(() => dailyEntries.id),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const doctorSettlements = pgTable("doctor_settlements", {
  id: serial("id").primaryKey(),
  doctorName: text("doctor_name").notNull(),
  periodFrom: text("period_from").notNull(),
  periodTo: text("period_to").notNull(),
  periodType: text("period_type").notNull().default("weekly"),
  totalRevenue: integer("total_revenue").default(0),
  commission: integer("commission").default(0),
  salary: integer("salary").default(0),
  totalDue: integer("total_due").default(0),
  amountPaid: integer("amount_paid").notNull(),
  currency: text("currency").notNull().default("₪"),
  notes: text("notes"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

// Schemas
export const insertPatientSchema = createInsertSchema(patients).omit({ 
  id: true, 
  createdAt: true 
});

export const insertAppointmentSchema = createInsertSchema(appointments, {
  phone: z.string().optional().or(z.literal("")),
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

export const insertDoctorSettlementSchema = createInsertSchema(doctorSettlements).omit({
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

export type DoctorSettlement = typeof doctorSettlements.$inferSelect;
export type InsertDoctorSettlement = z.infer<typeof insertDoctorSettlementSchema>;
