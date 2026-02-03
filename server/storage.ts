import { db } from "./db";
import {
  patients,
  appointments,
  type InsertPatient,
  type InsertAppointment,
  type Patient,
  type Appointment
} from "@shared/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";

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
}

export class DatabaseStorage implements IStorage {
  // Patients
  async getPatients(search?: string): Promise<Patient[]> {
    let query = db.select().from(patients);
    if (search) {
      // Simple case-insensitive search
      const lowerSearch = `%${search.toLowerCase()}%`;
      return await db.select().from(patients).where(
        sql`lower(${patients.fullName}) LIKE ${lowerSearch} OR ${patients.phone} LIKE ${lowerSearch}`
      );
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
    const [newPatient] = await db.insert(patients).values(patient).returning();
    return newPatient;
  }

  async updatePatient(id: number, updates: Partial<InsertPatient>): Promise<Patient> {
    const [updated] = await db.update(patients).set(updates).where(eq(patients.id, id)).returning();
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

  async checkAvailability(date: string, startTime: string): Promise<boolean> {
    const [existing] = await db.select().from(appointments).where(
      and(
        eq(appointments.date, date),
        eq(appointments.startTime, startTime),
        sql`${appointments.status} != 'cancelled'` // Don't count cancelled
      )
    );
    return !existing;
  }
}

export const storage = new DatabaseStorage();
