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

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === Auth Routes (no middleware) ===
  app.post("/api/auth/login", async (req, res) => {
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
  });

  app.post("/api/auth/logout", authMiddleware, async (req, res) => {
    if (req.sessionId) await storage.deleteSession(req.sessionId);
    res.json({ message: "تم تسجيل الخروج" });
  });

  app.get("/api/auth/me", authMiddleware, async (req, res) => {
    const { passwordHash, ...safeUser } = req.user!;
    res.json(safeUser);
  });

  // === Users (admin only) ===
  app.get("/api/users", authMiddleware, requirePermission("user_management"), async (req, res) => {
    const allUsers = await storage.getUsers();
    const safeUsers = allUsers.map(({ passwordHash, ...u }) => u);
    res.json(safeUsers);
  });

  app.post("/api/users", authMiddleware, requirePermission("user_management"), async (req, res) => {
    try {
      const { username, password, displayName, role, permissions } = req.body;
      if (!username || !password || !displayName) {
        return res.status(400).json({ message: "جميع الحقول مطلوبة" });
      }
      if (password.length < 4) {
        return res.status(400).json({ message: "كلمة المرور قصيرة جداً" });
      }
      const allowedRoles = ["doctor", "assistant"];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: "دور غير صالح" });
      }
      const validPerms = (permissions || []).filter((p: string) => PERMISSIONS.includes(p as Permission) && p !== "user_management");
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
      throw err;
    }
  });

  app.put("/api/users/:id", authMiddleware, requirePermission("user_management"), async (req, res) => {
    const id = Number(req.params.id);
    const target = await storage.getUser(id);
    if (!target) return res.status(404).json({ message: "المستخدم غير موجود" });
    if (target.role === "admin" && req.user!.id !== target.id) {
      return res.status(403).json({ message: "لا يمكن تعديل المدير" });
    }
    const { displayName, role, permissions, active, password } = req.body;
    const allowedRoles = ["doctor", "assistant"];
    const safeRole = target.role === "admin" ? undefined : (allowedRoles.includes(role) ? role : undefined);
    const validPerms = target.role === "admin" ? undefined : (permissions || []).filter((p: string) => PERMISSIONS.includes(p as Permission));
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
  });

  app.delete("/api/users/:id", authMiddleware, requirePermission("user_management"), async (req, res) => {
    const id = Number(req.params.id);
    const user = await storage.getUser(id);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    if (user.role === "admin") return res.status(403).json({ message: "لا يمكن حذف المدير" });
    await storage.deleteUser(id);
    res.status(204).send();
  });

  // === Patients (protected) ===
  app.get(api.patients.list.path, authMiddleware, requirePermission("patients_view"), async (req, res) => {
    const search = req.query.search as string | undefined;
    const patients = await storage.getPatients(search);
    res.json(patients);
  });

  app.get(api.patients.get.path, authMiddleware, requirePermission("patients_view"), async (req, res) => {
    const patient = await storage.getPatient(Number(req.params.id));
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  });

  app.post(api.patients.create.path, authMiddleware, requirePermission("patients_edit"), async (req, res) => {
    try {
      const input = api.patients.create.input.parse(req.body);
      const existing = await storage.getPatientByPhone(input.phone);
      if (existing) {
        return res.status(409).json({ message: "رقم الهاتف مسجل بالفعل لمريض آخر" });
      }
      const patient = await storage.createPatient(input);
      res.status(201).json(patient);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.patients.update.path, authMiddleware, requirePermission("patients_edit"), async (req, res) => {
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
  });

  // === Appointments (protected) ===
  app.get(api.appointments.list.path, authMiddleware, requirePermission("appointments"), async (req, res) => {
    const date = req.query.date as string | undefined;
    const appointments = await storage.getAppointments(date);
    res.json(appointments);
  });

  app.post(api.appointments.create.path, authMiddleware, requirePermission("appointments"), async (req, res) => {
    try {
      const input = api.appointments.create.input.parse(req.body);
      const slotsToCheck = [];
      let [sh, sm] = input.startTime.split(":").map(Number);
      const [eh, em] = input.endTime.split(":").map(Number);
      const endMinutes = eh * 60 + em;
      while (sh * 60 + sm < endMinutes) {
        slotsToCheck.push(`${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`);
        sm += 30;
        if (sm >= 60) { sh += 1; sm -= 60; }
      }
      for (const slot of slotsToCheck) {
        const isAvailable = await storage.checkAvailability(input.date, slot);
        if (!isAvailable) {
          return res.status(409).json({ message: `الوقت ${slot} محجوز مسبقاً` });
        }
      }
      const appointment = await storage.createAppointment(input);
      res.status(201).json(appointment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.appointments.update.path, authMiddleware, requirePermission("appointments"), async (req, res) => {
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
  });

  app.delete(api.appointments.delete.path, authMiddleware, requirePermission("appointments"), async (req, res) => {
    await storage.deleteAppointment(Number(req.params.id));
    res.status(204).send();
  });

  // WhatsApp Templates
  app.get(api.whatsappTemplates.list.path, authMiddleware, async (_req, res) => {
    const templates = await storage.getWhatsappTemplates();
    res.json(templates);
  });

  app.post(api.whatsappTemplates.create.path, authMiddleware, requirePermission("appointments"), async (req, res) => {
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
  });

  app.put(api.whatsappTemplates.update.path, authMiddleware, requirePermission("appointments"), async (req, res) => {
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
  });

  app.delete(api.whatsappTemplates.delete.path, authMiddleware, requirePermission("appointments"), async (req, res) => {
    await storage.deleteWhatsappTemplate(Number(req.params.id));
    res.status(204).send();
  });

  // === Expense Categories ===
  app.get(api.expenseCategories.list.path, authMiddleware, requirePermission("payments"), async (_req, res) => {
    const categories = await storage.getExpenseCategories();
    res.json(categories);
  });

  app.post(api.expenseCategories.create.path, authMiddleware, requirePermission("payments"), async (req, res) => {
    try {
      const input = api.expenseCategories.create.input.parse(req.body);
      const category = await storage.createExpenseCategory(input);
      res.status(201).json(category);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === "23505") {
        return res.status(409).json({ message: "هذا القسم موجود بالفعل" });
      }
      throw err;
    }
  });

  app.put(api.expenseCategories.update.path, authMiddleware, requirePermission("payments"), async (req, res) => {
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
  });

  app.delete(api.expenseCategories.delete.path, authMiddleware, requirePermission("payments"), async (req, res) => {
    await storage.deleteExpenseCategory(Number(req.params.id));
    res.status(204).send();
  });

  // === Expenses ===
  app.get(api.expenses.list.path, authMiddleware, requirePermission("payments"), async (req, res) => {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const expensesList = await storage.getExpenses(startDate, endDate);
    res.json(expensesList);
  });

  app.post(api.expenses.create.path, authMiddleware, requirePermission("payments"), async (req, res) => {
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
  });

  app.put(api.expenses.update.path, authMiddleware, requirePermission("payments"), async (req, res) => {
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
  });

  app.delete(api.expenses.delete.path, authMiddleware, requirePermission("payments"), async (req, res) => {
    await storage.deleteExpense(Number(req.params.id));
    res.status(204).send();
  });

  // === Daily Entries ===
  app.get(api.dailyEntries.list.path, authMiddleware, requirePermission("appointments"), async (req, res) => {
    const date = req.query.date as string | undefined;
    const entries = await storage.getDailyEntries(date);
    res.json(entries);
  });

  app.post(api.dailyEntries.create.path, authMiddleware, requirePermission("appointments"), async (req, res) => {
    try {
      const input = api.dailyEntries.create.input.parse(req.body);
      const entry = await storage.createDailyEntry(input);
      res.status(201).json(entry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.dailyEntries.update.path, authMiddleware, requirePermission("appointments"), async (req, res) => {
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
  });

  app.delete(api.dailyEntries.delete.path, authMiddleware, requirePermission("appointments"), async (req, res) => {
    await storage.deleteDailyEntry(Number(req.params.id));
    res.status(204).send();
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
