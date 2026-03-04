import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import type { ExpenseCategory, Expense } from "@shared/schema";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Receipt,
  Folder,
  FlaskConical,
  Wrench,
  Building2,
  Zap,
  Users,
  Settings,
  Tag,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  FileDown,
  Calendar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { arSA } from "date-fns/locale";

const ICON_MAP: Record<string, LucideIcon> = {
  Folder,
  FlaskConical,
  Wrench,
  Building2,
  Zap,
  Users,
  Settings,
  Tag,
  Receipt,
  DollarSign,
};

const ICON_OPTIONS = [
  { value: "FlaskConical", label: "مختبر" },
  { value: "Wrench", label: "أدوات" },
  { value: "Building2", label: "مبنى" },
  { value: "Zap", label: "كهرباء" },
  { value: "Users", label: "أشخاص" },
  { value: "Settings", label: "صيانة" },
  { value: "Tag", label: "عام" },
  { value: "Receipt", label: "فاتورة" },
  { value: "Folder", label: "مجلد" },
];

const COLOR_OPTIONS = [
  "#8b5cf6", "#f59e0b", "#3b82f6", "#eab308", "#10b981",
  "#6b7280", "#ef4444", "#ec4899", "#14b8a6", "#f97316",
];

type PeriodView = "daily" | "weekly" | "monthly" | "yearly";

function getDateRange(view: PeriodView, baseDate: Date): { from: Date; to: Date; label: string } {
  switch (view) {
    case "daily":
      return {
        from: baseDate,
        to: baseDate,
        label: format(baseDate, "EEEE d MMMM yyyy", { locale: arSA }),
      };
    case "weekly": {
      const from = startOfWeek(baseDate, { weekStartsOn: 6 });
      const to = endOfWeek(baseDate, { weekStartsOn: 6 });
      return {
        from,
        to,
        label: `${format(from, "d MMM", { locale: arSA })} — ${format(to, "d MMM yyyy", { locale: arSA })}`,
      };
    }
    case "monthly": {
      const from = startOfMonth(baseDate);
      const to = endOfMonth(baseDate);
      return {
        from,
        to,
        label: format(baseDate, "MMMM yyyy", { locale: arSA }),
      };
    }
    case "yearly": {
      const from = startOfYear(baseDate);
      const to = endOfYear(baseDate);
      return {
        from,
        to,
        label: format(baseDate, "yyyy", { locale: arSA }),
      };
    }
  }
}

function navigateDate(view: PeriodView, baseDate: Date, direction: number): Date {
  switch (view) {
    case "daily": return addDays(baseDate, direction);
    case "weekly": return addWeeks(baseDate, direction);
    case "monthly": return addMonths(baseDate, direction);
    case "yearly": return addYears(baseDate, direction);
  }
}

export default function Expenses() {
  const { toast } = useToast();
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "expense"; id: number; name: string } | null>(null);

  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("Folder");
  const [catColor, setCatColor] = useState("#6b7280");

  const [expCategoryId, setExpCategoryId] = useState<string>("");
  const [expAmount, setExpAmount] = useState("");
  const [expCurrency, setExpCurrency] = useState("₪");
  const [expDescription, setExpDescription] = useState("");
  const [expDate, setExpDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [periodView, setPeriodView] = useState<PeriodView>("monthly");
  const [baseDate, setBaseDate] = useState(new Date());

  const { data: categories, isLoading: catLoading } = useQuery<ExpenseCategory[]>({
    queryKey: [api.expenseCategories.list.path],
  });

  const { data: allExpenses, isLoading: expLoading } = useQuery<Expense[]>({
    queryKey: [api.expenses.list.path],
  });

  const dateRange = useMemo(() => getDateRange(periodView, baseDate), [periodView, baseDate]);

  const filteredExpenses = useMemo(() => {
    if (!allExpenses) return [];
    const fromStr = format(dateRange.from, "yyyy-MM-dd");
    const toStr = format(dateRange.to, "yyyy-MM-dd");
    return allExpenses.filter((e) => e.date >= fromStr && e.date <= toStr);
  }, [allExpenses, dateRange]);

  const periodTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      totals[e.currency] = (totals[e.currency] || 0) + e.amount;
    });
    return totals;
  }, [filteredExpenses]);

  const categoryTotals = useMemo(() => {
    const map: Record<number, Record<string, number>> = {};
    filteredExpenses.forEach((e) => {
      if (!map[e.categoryId]) map[e.categoryId] = {};
      map[e.categoryId][e.currency] = (map[e.categoryId][e.currency] || 0) + e.amount;
    });
    return map;
  }, [filteredExpenses]);

  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", api.expenseCategories.create.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenseCategories.list.path] });
      setShowCategoryDialog(false);
      toast({ title: "تم إضافة القسم بنجاح" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", api.expenseCategories.update.path.replace(":id", String(id)), data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenseCategories.list.path] });
      setShowCategoryDialog(false);
      setEditingCategory(null);
      toast({ title: "تم تحديث القسم بنجاح" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", api.expenseCategories.delete.path.replace(":id", String(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenseCategories.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] });
      toast({ title: "تم حذف القسم وجميع مصروفاته" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", api.expenses.create.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] });
      setShowExpenseDialog(false);
      resetExpenseForm();
      toast({ title: "تم إضافة المصروف بنجاح" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", api.expenses.update.path.replace(":id", String(id)), data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] });
      setShowExpenseDialog(false);
      setEditingExpense(null);
      resetExpenseForm();
      toast({ title: "تم تحديث المصروف بنجاح" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", api.expenses.delete.path.replace(":id", String(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] });
      toast({ title: "تم حذف المصروف" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  function resetExpenseForm() {
    setExpCategoryId("");
    setExpAmount("");
    setExpCurrency("₪");
    setExpDescription("");
    setExpDate(format(new Date(), "yyyy-MM-dd"));
  }

  function openAddCategory() {
    setCatName("");
    setCatIcon("Folder");
    setCatColor("#6b7280");
    setEditingCategory(null);
    setShowCategoryDialog(true);
  }

  function openEditCategory(cat: ExpenseCategory) {
    setCatName(cat.name);
    setCatIcon(cat.icon);
    setCatColor(cat.color);
    setEditingCategory(cat);
    setShowCategoryDialog(true);
  }

  function openAddExpense() {
    resetExpenseForm();
    setEditingExpense(null);
    setShowExpenseDialog(true);
  }

  function openEditExpense(exp: Expense) {
    setExpCategoryId(String(exp.categoryId));
    setExpAmount(String(exp.amount));
    setExpCurrency(exp.currency);
    setExpDescription(exp.description || "");
    setExpDate(exp.date);
    setEditingExpense(exp);
    setShowExpenseDialog(true);
  }

  function handleSaveCategory() {
    if (!catName.trim()) return;
    const data = { name: catName.trim(), icon: catIcon, color: catColor };
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  }

  function handleSaveExpense() {
    if (!expCategoryId || !expAmount || !expDate) return;
    const data = {
      categoryId: Number(expCategoryId),
      amount: Number(expAmount),
      currency: expCurrency,
      description: expDescription || null,
      date: expDate,
    };
    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, data });
    } else {
      createExpenseMutation.mutate(data);
    }
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "category") {
      deleteCategoryMutation.mutate(deleteTarget.id);
    } else {
      deleteExpenseMutation.mutate(deleteTarget.id);
    }
    setDeleteTarget(null);
  }

  function getCategoryName(id: number) {
    return categories?.find((c) => c.id === id)?.name || "غير معروف";
  }

  function getCategoryColor(id: number) {
    return categories?.find((c) => c.id === id)?.color || "#6b7280";
  }

  function getCategoryIcon(id: number) {
    const iconName = categories?.find((c) => c.id === id)?.icon || "Folder";
    return ICON_MAP[iconName] || Folder;
  }

  function handleExportPdf() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const viewLabels: Record<PeriodView, string> = {
      daily: "يومي",
      weekly: "أسبوعي",
      monthly: "شهري",
      yearly: "سنوي",
    };

    const totalRows = Object.entries(periodTotals).map(([curr, total]) =>
      `<div style="display:inline-block;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 16px;margin:4px">
        <span style="font-size:20px;font-weight:bold;color:#dc2626">${total.toLocaleString()} ${curr}</span>
      </div>`
    ).join("");

    const catSections = (categories || []).map((cat) => {
      const catExps = filteredExpenses.filter((e) => e.categoryId === cat.id);
      if (catExps.length === 0) return "";

      const catTotals = categoryTotals[cat.id] || {};
      const catTotalStr = Object.entries(catTotals).map(([curr, t]) => `${t.toLocaleString()} ${curr}`).join(" | ");

      const rows = catExps.map((e, i) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#64748b">${i + 1}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${(() => { try { return format(parseISO(e.date), "d MMMM yyyy", { locale: arSA }); } catch { return e.date; } })()}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${e.description || "—"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:bold;color:#dc2626">${e.amount.toLocaleString()} ${e.currency}</td>
        </tr>
      `).join("");

      return `
        <div style="margin-bottom:24px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:8px 12px;background:${cat.color}15;border-radius:8px;border-right:4px solid ${cat.color}">
            <span style="font-weight:bold;font-size:15px;color:${cat.color}">${cat.name}</span>
            <span style="margin-right:auto;font-weight:bold;color:#334155">${catTotalStr}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <thead>
              <tr style="background:#f8fafc">
                <th style="padding:8px 12px;text-align:center;color:#64748b;font-weight:600;width:50px">#</th>
                <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600">التاريخ</th>
                <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600">الوصف</th>
                <th style="padding:8px 12px;text-align:center;color:#64748b;font-weight:600">المبلغ</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }).filter(Boolean).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>تقرير المصروفات - ${dateRange.label}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; direction: rtl; padding: 30px; color: #1e293b; background: #fff; }
          @media print {
            body { padding: 15px; }
            .no-print { display: none !important; }
            @page { margin: 15mm; size: A4; }
          }
        </style>
      </head>
      <body>
        <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e2e8f0">
          <h1 style="font-size:24px;color:#0f172a;margin-bottom:4px">تقرير المصروفات</h1>
          <p style="color:#64748b;font-size:14px">عيادة صوالحي دنت</p>
          <div style="margin-top:8px">
            <span style="background:#f1f5f9;padding:4px 16px;border-radius:20px;font-size:13px;color:#475569">
              ${viewLabels[periodView]}: ${dateRange.label}
            </span>
          </div>
        </div>

        <div style="text-align:center;margin-bottom:24px">
          <p style="color:#64748b;font-size:13px;margin-bottom:8px">إجمالي المصروفات</p>
          ${totalRows || '<span style="color:#94a3b8">لا توجد مصروفات</span>'}
          <p style="color:#94a3b8;font-size:12px;margin-top:4px">عدد المصروفات: ${filteredExpenses.length}</p>
        </div>

        ${catSections || '<p style="text-align:center;color:#94a3b8;padding:40px">لا توجد مصروفات في هذه الفترة</p>'}

        <div style="margin-top:30px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px">
          تم إنشاء التقرير بتاريخ ${format(new Date(), "d MMMM yyyy - HH:mm", { locale: arSA })}
        </div>

        <div class="no-print" style="text-align:center;margin-top:20px">
          <button onclick="window.print()" style="background:#0f172a;color:white;border:none;padding:10px 32px;border-radius:8px;font-size:14px;font-family:Cairo;cursor:pointer">
            طباعة / حفظ PDF
          </button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  const isLoading = catLoading || expLoading;
  const isCurrentPeriod = useMemo(() => {
    const now = new Date();
    const currentRange = getDateRange(periodView, now);
    const fromStr = format(dateRange.from, "yyyy-MM-dd");
    const currentFromStr = format(currentRange.from, "yyyy-MM-dd");
    return fromStr === currentFromStr;
  }, [periodView, dateRange]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-tajawal text-slate-900" data-testid="text-page-title">
              المصروفات
            </h1>
            <p className="text-slate-500 mt-1 text-sm">إدارة أقسام المصروفات وتسجيل النفقات</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleExportPdf} variant="outline" size="sm" data-testid="button-export-pdf">
              <FileDown className="ml-1 w-4 h-4" />
              تصدير PDF
            </Button>
            <Button onClick={openAddCategory} variant="outline" size="sm" data-testid="button-add-category">
              <Plus className="ml-1 w-4 h-4" />
              قسم جديد
            </Button>
            <Button onClick={openAddExpense} size="sm" data-testid="button-add-expense">
              <Plus className="ml-1 w-4 h-4" />
              إضافة مصروف
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {(["daily", "weekly", "monthly", "yearly"] as PeriodView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => { setPeriodView(v); setBaseDate(new Date()); }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${periodView === v ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                  data-testid={`button-period-${v}`}
                >
                  {{ daily: "يومي", weekly: "أسبوعي", monthly: "شهري", yearly: "سنوي" }[v]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-1 justify-center">
              <Button variant="ghost" size="sm" onClick={() => setBaseDate(navigateDate(periodView, baseDate, -1))} data-testid="button-next-period">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="text-center min-w-[200px]">
                <span className="font-bold text-sm text-slate-800" data-testid="text-period-label">{dateRange.label}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setBaseDate(navigateDate(periodView, baseDate, 1))} disabled={isCurrentPeriod} data-testid="button-prev-period">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>

            {!isCurrentPeriod && (
              <Button variant="outline" size="sm" onClick={() => setBaseDate(new Date())} data-testid="button-today">
                <Calendar className="ml-1 w-3 h-3" />
                اليوم
              </Button>
            )}
          </div>

          {Object.keys(periodTotals).length > 0 && (
            <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-slate-100">
              <span className="text-sm text-slate-500">إجمالي الفترة:</span>
              {Object.entries(periodTotals).map(([curr, total]) => (
                <span key={curr} className="font-bold text-red-600 text-lg" data-testid={`text-total-${curr}`}>
                  {total.toLocaleString()} {curr}
                </span>
              ))}
              <span className="text-xs text-slate-400">({filteredExpenses.length} مصروف)</span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-bold font-tajawal text-slate-800 mb-3">أقسام المصروفات</h2>
              {categories && categories.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {categories.map((cat) => {
                    const Icon = ICON_MAP[cat.icon] || Folder;
                    const catTotals = categoryTotals[cat.id] || {};
                    return (
                      <Card key={cat.id} className="border-0 shadow-md" data-testid={`card-category-${cat.id}`}>
                        <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: cat.color + "20" }}
                          >
                            <Icon className="w-6 h-6" style={{ color: cat.color }} />
                          </div>
                          <span className="font-bold text-sm text-slate-800">{cat.name}</span>
                          {Object.entries(catTotals).length > 0 ? (
                            Object.entries(catTotals).map(([curr, total]) => (
                              <span key={curr} className="text-xs font-bold" style={{ color: cat.color }}>
                                {total.toLocaleString()} {curr}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">0</span>
                          )}
                          <div className="flex gap-1 mt-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditCategory(cat)}
                              data-testid={`button-edit-category-${cat.id}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500"
                              onClick={() => setDeleteTarget({ type: "category", id: cat.id, name: cat.name })}
                              data-testid={`button-delete-category-${cat.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-0 shadow-md">
                  <CardContent className="py-8 text-center text-slate-400">
                    <Folder className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>لا توجد أقسام بعد</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold font-tajawal text-slate-800 mb-3">سجل المصروفات</h2>
              <Card className="border-0 shadow-lg shadow-slate-200/50">
                <CardContent className="p-0">
                  {filteredExpenses.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {filteredExpenses.map((exp) => {
                        const CatIcon = getCategoryIcon(exp.categoryId);
                        return (
                          <div key={exp.id} className="p-4 flex items-center justify-between gap-3" data-testid={`row-expense-${exp.id}`}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                                style={{ backgroundColor: getCategoryColor(exp.categoryId) + "20" }}
                              >
                                <CatIcon className="w-5 h-5" style={{ color: getCategoryColor(exp.categoryId) }} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-800 text-sm">{exp.description || getCategoryName(exp.categoryId)}</span>
                                  <Badge variant="secondary" className="text-xs" style={{ backgroundColor: getCategoryColor(exp.categoryId) + "20", color: getCategoryColor(exp.categoryId) }}>
                                    {getCategoryName(exp.categoryId)}
                                  </Badge>
                                </div>
                                <span className="text-xs text-slate-400 block">
                                  {(() => {
                                    try {
                                      return format(parseISO(exp.date), "EEEE d MMMM yyyy", { locale: arSA });
                                    } catch {
                                      return exp.date;
                                    }
                                  })()}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold text-lg text-red-600">
                                {exp.amount.toLocaleString()} {exp.currency}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditExpense(exp)}
                                data-testid={`button-edit-expense-${exp.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500"
                                onClick={() => setDeleteTarget({ type: "expense", id: exp.id, name: exp.description || getCategoryName(exp.categoryId) })}
                                data-testid={`button-delete-expense-${exp.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>لا توجد مصروفات في هذه الفترة</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-tajawal">
              {editingCategory ? "تعديل القسم" : "إضافة قسم جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم القسم</Label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="مثل: المختبر"
                data-testid="input-category-name"
              />
            </div>
            <div>
              <Label>الأيقونة</Label>
              <Select value={catIcon} onValueChange={setCatIcon}>
                <SelectTrigger data-testid="select-category-icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((opt) => {
                    const I = ICON_MAP[opt.value] || Folder;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <I className="w-4 h-4" />
                          <span>{opt.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>اللون</Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${catColor === c ? "border-slate-800 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setCatColor(c)}
                    data-testid={`color-option-${c}`}
                  />
                ))}
              </div>
            </div>
            <Button
              onClick={handleSaveCategory}
              disabled={!catName.trim() || createCategoryMutation.isPending || updateCategoryMutation.isPending}
              className="w-full"
              data-testid="button-save-category"
            >
              {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              )}
              {editingCategory ? "تحديث" : "إضافة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-tajawal">
              {editingExpense ? "تعديل المصروف" : "إضافة مصروف جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>القسم</Label>
              <Select value={expCategoryId} onValueChange={setExpCategoryId}>
                <SelectTrigger data-testid="select-expense-category">
                  <SelectValue placeholder="اختر القسم" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => {
                    const I = ICON_MAP[cat.icon] || Folder;
                    return (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        <div className="flex items-center gap-2">
                          <I className="w-4 h-4" style={{ color: cat.color }} />
                          <span>{cat.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المبلغ</Label>
                <Input
                  type="number"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  data-testid="input-expense-amount"
                />
              </div>
              <div>
                <Label>العملة</Label>
                <Select value={expCurrency} onValueChange={setExpCurrency}>
                  <SelectTrigger data-testid="select-expense-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="₪">شيكل (₪)</SelectItem>
                    <SelectItem value="$">دولار ($)</SelectItem>
                    <SelectItem value="د.أ">دينار (د.أ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>التاريخ</Label>
              <Input
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                data-testid="input-expense-date"
              />
            </div>
            <div>
              <Label>الوصف (اختياري)</Label>
              <Textarea
                value={expDescription}
                onChange={(e) => setExpDescription(e.target.value)}
                placeholder="وصف المصروف..."
                rows={2}
                data-testid="input-expense-description"
              />
            </div>
            <Button
              onClick={handleSaveExpense}
              disabled={!expCategoryId || !expAmount || !expDate || createExpenseMutation.isPending || updateExpenseMutation.isPending}
              className="w-full"
              data-testid="button-save-expense"
            >
              {(createExpenseMutation.isPending || updateExpenseMutation.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              )}
              {editingExpense ? "تحديث" : "إضافة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "category"
                ? `هل أنت متأكد من حذف قسم "${deleteTarget?.name}"؟ سيتم حذف جميع المصروفات المرتبطة به.`
                : `هل أنت متأكد من حذف المصروف "${deleteTarget?.name}"؟`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel data-testid="button-cancel-delete">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
