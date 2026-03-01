import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { loginSchema, type User, type Permission, PERMISSIONS } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
    }
  }
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.headers["x-session-id"] as string;
    if (!sessionId) {
      return res.status(401).json({ message: "غير مصرح" });
    }

    const session = await storage.getSession(sessionId);
    if (!session || !session.user.active) {
      return res.status(401).json({ message: "الجلسة منتهية" });
    }

    req.user = session.user;
    req.sessionId = sessionId;
    next();
  } catch (err) {
    next(err);
  }
}

function requirePermission(...perms: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "غير مصرح" });
    if (req.user.role === "admin") return next();
    const userPerms = (req.user.permissions as Permission[]) || [];
    const hasAll = perms.every((p) => userPerms.includes(p));
    if (!hasAll) return res.status(403).json({ message: "لا تملك صلاحية لهذا الإجراء" });
    next();
  };
}

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  loginAttempts.forEach((record, ip) => {
    if (now - record.lastAttempt > LOGIN_WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  });
}, 5 * 60 * 1000);

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now - record.lastAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }
  record.count++;
  record.lastAttempt = now;
  return record.count <= MAX_LOGIN_ATTEMPTS;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === Auth Routes (no middleware) ===
  app.post("/api/auth/login", asyncHandler(async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkLoginRateLimit(clientIp)) {
      return res.status(429).json({ message: "محاولات كثيرة. حاول بعد قليل" });
    }
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);
      if (!user || !user.active) {
        return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }
      const valid = await storage.verifyPassword(user, password);
      if (!valid) {
        return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }
      const session = await storage.createSession(user.id);
      const { passwordHash, ...safeUser } = user;
      res.json({ sessionId: session.id, user: safeUser });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  }));

  app.post("/api/auth/logout", authMiddleware, asyncHandler(async (req, res) => {
    if (req.sessionId) await storage.deleteSession(req.sessionId);
    res.json({ message: "تم تسجيل الخروج" });
  }));

  app.get("/api/auth/me", authMiddleware, asyncHandler(async (req, res) => {
    const { passwordHash, ...safeUser } = req.user!;
    res.json(safeUser);
  }));

  app.get("/api/doctors", authMiddleware, asyncHandler(async (req, res) => {
    const allUsers = await storage.getUsers();
    const doctors = allUsers
      .filter((u) => u.role === "doctor" || u.role === "admin")
      .map(({ id, displayName, role }) => ({ id, displayName, role }));
    res.json(doctors);
  }));

  // === Users (admin only) ===
  app.get("/api/users", authMiddleware, requirePermission("user_management"), asyncHandler(async (req, res) => {
    const allUsers = await storage.getUsers();
    const safeUsers = allUsers.map(({ passwordHash, ...u }) => u);
    res.json(safeUsers);
  }));

  const createUserSchema = z.object({
    username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل").max(50),
    password: z.string().min(4, "كلمة المرور قصيرة جداً").max(100),
    displayName: z.string().min(1, "الاسم مطلوب").max(100),
    role: z.enum(["doctor", "assistant"], { errorMap: () => ({ message: "دور غير صالح" }) }),
    permissions: z.array(z.string()).optional().default([]),
  });

  app.post("/api/users", authMiddleware, requirePermission("user_management"), asyncHandler(async (req, res) => {
    try {
      const { username, password, displayName, role, permissions } = createUserSchema.parse(req.body);
      const validPerms = permissions.filter((p: string) => PERMISSIONS.includes(p as Permission) && p !== "user_management") as Permission[];
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }
      const user = await storage.createUser({
        username,
        password,
        displayName,
        role,
        permissions: validPerms,
      });
      const { passwordHash, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  }));

  const updateUserSchema = z.object({
    displayName: z.string().min(1).max(100).optional(),
    role: z.string().optional(),
    permissions: z.array(z.string()).optional(),
    active: z.boolean().optional(),
    password: z.string().min(4).max(100).optional().or(z.literal("")),
  });

  app.put("/api/users/:id", authMiddleware, requirePermission("user_management"), asyncHandler(async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "معرف غير صالح" });
      const target = await storage.getUser(id);
      if (!target) return res.status(404).json({ message: "المستخدم غير موجود" });
      if (target.role === "admin" && req.user!.id !== target.id) {
        return res.status(403).json({ message: "لا يمكن تعديل المدير" });
      }
      const { displayName, role, permissions, active, password } = updateUserSchema.parse(req.body);
      const allowedRoles = ["doctor", "assistant"];
      const safeRole = target.role === "admin" ? undefined : (role && allowedRoles.includes(role) ? role : undefined);
      const validPerms = target.role === "admin" ? undefined : (permissions || []).filter((p: string) => PERMISSIONS.includes(p as Permission)) as Permission[] | undefined;
      const updated = await storage.updateUser(id, {
        displayName,
        role: safeRole,
        permissions: validPerms,
        active,
        password: password || undefined,
      });
      if (!updated) return res.status(404).json({ message: "المستخدم غير موجود" });
      const { passwordHash, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  }));

  app.delete("/api/users/:id", authMiddleware, requirePermission("user_management"), asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "معرف غير صالح" });
    const user = await storage.getUser(id);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    if (user.role === "admin") return res.status(403).json({ message: "لا يمكن حذف المدير" });
    await storage.deleteUser(id);
    res.status(204).send();
  }));

  // === Patients (protected) ===
  app.get(api.patients.list.path, authMiddleware, requirePermission("patients_view"), asyncHandler(async (req, res) => {
    const search = req.query.search as string | undefined;
    const patients = await storage.getPatients(search);
    res.json(patients);
  }));

  app.get(api.patients.get.path, authMiddleware, requirePermission("patients_view"), asyncHandler(async (req, res) => {
    const patient = await storage.getPatient(Number(req.params.id));
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  }));

  app.post(api.patients.create.path, authMiddleware, requirePermission("patients_edit"), asyncHandler(async (req, res) => {
    try {
      const input = api.patients.create.input.parse(req.body);
      const existing = await storage.getPatientByPhone(input.phone);
      if (existing) {
        return res.status(409).json({ message: "رقم الهاتف مسجل بالفعل لمريض آخر" });
      }
      const patient = await storage.createPatient(input);
      res.status(201).json(patient);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === "23505" || err?.message?.includes("UNIQUE constraint failed") || err?.message?.includes("duplicate key")) {
        return res.status(409).json({ message: "رقم الهاتف مسجل بالفعل لمريض آخر" });
      }
      throw err;
    }
  }));

  app.put(api.patients.update.path, authMiddleware, requirePermission("patients_edit"), asyncHandler(async (req, res) => {
    try {
      const input = api.patients.update.input.parse(req.body);
      const patient = await storage.updatePatient(Number(req.params.id), input);
      if (!patient) return res.status(404).json({ message: "Patient not found" });
      res.json(patient);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  }));

  // === Appointments (protected) ===
  app.get(api.appointments.list.path, authMiddleware, requirePermission("appointments"), asyncHandler(async (req, res) => {
    const date = req.query.date as string | undefined;
    const appointments = await storage.getAppointments(date);
    res.json(appointments);
  }));

  app.post(api.appointments.create.path, authMiddleware, requirePermission("appointments"), asyncHandler(async (req, res) => {
    try {
      const input = api.appointments.create.input.parse(req.body);
      const slotsToCheck: string[] = [];
      let [sh, sm] = input.startTime.split(":").map(Number);
      const [eh, em] = input.endTime.split(":").map(Number);
      const endMinutes = eh * 60 + em;
      while (sh * 60 + sm < endMinutes) {
        slotsToCheck.push(`${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`);
        sm += 30;
        if (sm >= 60) { sh += 1; sm -= 60; }
      }
      const conflictSlot = await storage.checkSlotsAvailability(input.date, slotsToCheck);
      if (conflictSlot) {
        return res.status(409).json({ message: `الوقت ${conflictSlot} محجوز مسبقاً` });
      }
      const appointment = await storage.createAppointment(input);
      res.status(201).json(appointment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  }));

  app.put(api.appointments.update.path, authMiddleware, requirePermission("appointments"), asyncHandler(async (req, res) => {
    try {
      const input = api.appointments.update.input.parse(req.body);
      const appointment = await storage.updateAppointment(Number(req.params.id), input);
      if (!appointment) return res.status(404).json({ message: "Appointment not found" });
      res.json(appointment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  }));

  app.delete(api.appointments.delete.path, authMiddleware, requirePermission("appointments"), asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "معرف غير صالح" });
    await storage.deleteAppointment(id);
    res.status(204).send();
  }));

  // WhatsApp Templates
  app.get(api.whatsappTemplates.list.path, authMiddleware, asyncHandler(async (_req, res) => {
    const templates = await storage.getWhatsappTemplates();
    res.json(templates);
  }));

  app.post(api.whatsappTemplates.create.path, authMiddleware, requirePermission("appointments"), asyncHandler(async (req, res) => {
    try {
      const input = api.whatsappTemplates.create.input.parse(req.body);
      const template = await storage.createWhatsappTemplate(input);
      res.status(201).json(template);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  }));

  app.put(api.whatsappTemplates.update.path, authMiddleware, requirePermission("appointments"), asyncHandler(async (req, res) => {
    try {
      const input = api.whatsappTemplates.update.input.parse(req.body);
      const template = await storage.updateWhatsappTemplate(Number(req.params.id), input);
      if (!template) return res.status(404).json({ message: "القالب غير موجود" });
      res.json(template);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  }));

  app.delete(api.whatsappTemplates.delete.path, authMiddleware, requirePermission("appointments"), asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "معرف غير صالح" });
    await storage.deleteWhatsappTemplate(id);
    res.status(204).send();
  }));

  // === Expense Categories ===
  app.get(api.expenseCategories.list.path, authMiddleware, requirePermission("payments"), asyncHandler(async (_req, res) => {
    const categories = await storage.getExpenseCategories();
    res.json(categories);
  }));

  app.post(api.expenseCategories.create.path, authMiddleware, requirePermission("payments"), asyncHandler(async (req, res) => {
    try {
      const input = api.expenseCategories.create.input.parse(req.body);
      const category = await storage.createExpenseCategory(input);
      res.status(201).json(category);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === "23505" || err?.message?.includes("UNIQUE constraint failed") || err?.message?.includes("duplicate key")) {
        return res.status(409).json({ message: "هذا القسم موجود بالفعل" });
      }
      throw err;
    }
  }));

  app.put(api.expenseCategories.update.path, authMiddleware, requirePermission("payments"), asyncHandler(async (req, res) => {
    try {
      const input = api.expenseCategories.update.input.parse(req.body);
      const category = await storage.updateExpenseCategory(Number(req.params.id), input);
      if (!category) return res.status(404).json({ message: "القسم غير موجود" });
      res.json(category);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  }));

  app.delete(api.expenseCategories.delete.path, authMiddleware, requirePermission("payments"), asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "معرف غير صالح" });
    await storage.deleteExpenseCategory(id);
    res.status(204).send();
  }));

  // === Expenses ===
  app.get(api.expenses.list.path, authMiddleware, requirePermission("payments"), asyncHandler(async (req, res) => {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const expensesList = await storage.getExpenses(startDate, endDate);
    res.json(expensesList);
  }));

  app.post(api.expenses.create.path, authMiddleware, requirePermission("payments"), asyncHandler(async (req, res) => {
    try {
      const input = api.expenses.create.input.parse(req.body);
      const expense = await storage.createExpense(input);
      res.status(201).json(expense);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  }));

  app.put(api.expenses.update.path, authMiddleware, requirePermission("payments"), asyncHandler(async (req, res) => {
    try {
      const input = api.expenses.update.input.parse(req.body);
      const expense = await storage.updateExpense(Number(req.params.id), input);
      if (!expense) return res.status(404).json({ message: "المصروف غير موجود" });
      res.json(expense);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  }));

  app.delete(api.expenses.delete.path, authMiddleware, requirePermission("payments"), asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "معرف غير صالح" });
    await storage.deleteExpense(id);
    res.status(204).send();
  }));

  // === Treatment Notes ===
  app.get("/api/patients/:id/treatment-notes", authMiddleware, requirePermission("patients_view"), asyncHandler(async (req, res) => {
    const notes = await storage.getTreatmentNotes(Number(req.params.id));
    res.json(notes);
  }));

  // === Daily Entries ===
  app.get(api.dailyEntries.list.path, authMiddleware, requirePermission("appointments"), asyncHandler(async (req, res) => {
    const date = req.query.date as string | undefined;
    const entries = await storage.getDailyEntries(date);
    res.json(entries);
  }));

  app.post(api.dailyEntries.create.path, authMiddleware, requirePermission("appointments"), asyncHandler(async (req, res) => {
    try {
      const input = api.dailyEntries.create.input.parse(req.body);
      const entry = await storage.createDailyEntry(input);

      if (entry.patientId) {
        if (entry.notes && entry.notes.trim()) {
          await storage.createTreatmentNote({
            patientId: entry.patientId,
            date: entry.date,
            treatment: entry.treatment,
            doctor: entry.doctor,
            notes: entry.notes.trim(),
            dailyEntryId: entry.id,
          });
        }

        if (entry.amount && entry.amount > 0) {
          const patient = await storage.getPatient(entry.patientId);
          if (patient) {
            const currentPayments = (patient.payments as any[]) || [];
            const newPayment = {
              amount: entry.amount,
              date: entry.date,
              method: "cash" as const,
              currency: entry.currency || "₪",
            };
            const updatedPayments = [...currentPayments, newPayment];
            const totalPaid = updatedPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
            await storage.updatePatient(entry.patientId, {
              payments: updatedPayments,
              paidAmount: totalPaid,
            });
          }
        }
      }

      res.status(201).json(entry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  }));

  app.put(api.dailyEntries.update.path, authMiddleware, requirePermission("appointments"), asyncHandler(async (req, res) => {
    try {
      const input = api.dailyEntries.update.input.parse(req.body);
      const entry = await storage.updateDailyEntry(Number(req.params.id), input);
      if (!entry) return res.status(404).json({ message: "السجل غير موجود" });
      res.json(entry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  }));

  app.delete(api.dailyEntries.delete.path, authMiddleware, requirePermission("appointments"), asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "معرف غير صالح" });
    await storage.deleteDailyEntry(id);
    res.status(204).send();
  }));

  // Catch-all for unknown /api/* routes — return JSON 404 instead of SPA HTML
  app.all("/api/{*path}", (_req, res) => {
    res.status(404).json({ message: "المسار غير موجود" });
  });

  // Seed admin user, default templates, and expense categories
  await seedAdminUser();
  await storage.seedDefaultTemplates();
  await storage.seedDefaultExpenseCategories();

  return httpServer;
}

async function seedAdminUser() {
  const existingUsers = await storage.getUsers();
  if (existingUsers.length === 0) {
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    await storage.createUser({
      username: adminUsername,
      password: adminPassword,
      displayName: "المدير",
      role: "admin",
      permissions: [...PERMISSIONS],
    });
    console.log("Admin user created");
  }
}
