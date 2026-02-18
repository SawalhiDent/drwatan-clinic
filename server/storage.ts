import { db } from "./db";
import {
  patients,
  appointments,
  users,
  sessions,
  type InsertPatient,
  type InsertAppointment,
  type Patient,
  type Appointment,
  type User,
  type Session,
  type Permission,
} from "@shared/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";

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

  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(data: { username: string; password: string; displayName: string; role: string; permissions: Permission[] }): Promise<User>;
  updateUser(id: number, data: { displayName?: string; role?: string; permissions?: Permission[]; active?: boolean; password?: string }): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;
  verifyPassword(user: User, password: string): Promise<boolean>;

  // Sessions
  createSession(userId: number): Promise<Session>;
  getSession(id: string): Promise<(Session & { user: User }) | undefined>;
  deleteSession(id: string): Promise<void>;
  cleanExpiredSessions(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Patients
  async getPatients(search?: string): Promise<Patient[]> {
    let query = db.select().from(patients);
    if (search) {
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

  async checkAvailability(date: string, slotTime: string): Promise<boolean> {
    const dayAppointments = await db.select().from(appointments).where(
      and(
        eq(appointments.date, date),
        sql`${appointments.status} != 'cancelled'`
      )
    );
    const slotMin = parseInt(slotTime.split(":")[0]) * 60 + parseInt(slotTime.split(":")[1]);
    const conflict = dayAppointments.some(apt => {
      const startMin = parseInt(apt.startTime.split(":")[0]) * 60 + parseInt(apt.startTime.split(":")[1]);
      const endMin = parseInt(apt.endTime.split(":")[0]) * 60 + parseInt(apt.endTime.split(":")[1]);
      return slotMin >= startMin && slotMin < endMin;
    });
    return !conflict;
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

  async createUser(data: { username: string; password: string; displayName: string; role: string; permissions: Permission[] }): Promise<User> {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const [user] = await db.insert(users).values({
      username: data.username,
      passwordHash,
      displayName: data.displayName,
      role: data.role,
      permissions: data.permissions,
    }).returning();
    return user;
  }

  async updateUser(id: number, data: { displayName?: string; role?: string; permissions?: Permission[]; active?: boolean; password?: string }): Promise<User | undefined> {
    const updates: any = {};
    if (data.displayName !== undefined) updates.displayName = data.displayName;
    if (data.role !== undefined) updates.role = data.role;
    if (data.permissions !== undefined) updates.permissions = data.permissions;
    if (data.active !== undefined) updates.active = data.active;
    if (data.password) updates.passwordHash = await bcrypt.hash(data.password, 10);

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
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const [session] = await db.insert(sessions).values({ id, userId, expiresAt }).returning();
    return session;
  }

  async getSession(id: string): Promise<(Session & { user: User }) | undefined> {
    const results = await db
      .select()
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, id));

    if (results.length === 0) return undefined;

    const row = results[0];
    if (new Date() > row.sessions.expiresAt) {
      await this.deleteSession(id);
      return undefined;
    }

    return { ...row.sessions, user: row.users };
  }

  async deleteSession(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async cleanExpiredSessions(): Promise<void> {
    await db.delete(sessions).where(sql`${sessions.expiresAt} < NOW()`);
  }
}

export const storage = new DatabaseStorage();
