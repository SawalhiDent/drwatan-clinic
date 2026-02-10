import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull().unique(),
  age: integer("age"),
  gender: text("gender"), // "male" | "female"
  address: text("address"),
  allergies: text("allergies"),
  chronicDiseases: text("chronic_diseases"),
  currentMeds: text("current_meds"),
  notes: text("notes"),
  paidAmount: integer("paid_amount").default(0),
  currencySymbol: text("currency_symbol").default("₪"),
  payments: jsonb("payments").$type<{
    amount: number;
    date: string;
    method: "cash" | "check";
    checkImageUrl?: string;
    currency: string;
  }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  patientName: text("patient_name").notNull(), // Denormalized for ease or direct entry
  phone: text("phone").notNull(), // Denormalized for direct entry
  service: text("service").notNull(),
  notes: text("notes"),
  date: text("date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(), // HH:mm
  endTime: text("end_time").notNull(), // HH:mm
  status: text("status").default("scheduled"), // scheduled, completed, cancelled
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

// Types
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
