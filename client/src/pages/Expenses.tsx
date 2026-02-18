import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
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

  const { data: categories, isLoading: catLoading } = useQuery<ExpenseCategory[]>({
    queryKey: [api.expenseCategories.list.path],
  });

  const { data: allExpenses, isLoading: expLoading } = useQuery<Expense[]>({
    queryKey: [api.expenses.list.path],
  });

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

  const isLoading = catLoading || expLoading;

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
            <Button onClick={openAddCategory} variant="outline" data-testid="button-add-category">
              <Plus className="ml-2 w-4 h-4" />
              قسم جديد
            </Button>
            <Button onClick={openAddExpense} data-testid="button-add-expense">
              <Plus className="ml-2 w-4 h-4" />
              إضافة مصروف
            </Button>
          </div>
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
                    const catExpenses = allExpenses?.filter((e) => e.categoryId === cat.id) || [];
                    const totalByCurrency: Record<string, number> = {};
                    catExpenses.forEach((e) => {
                      totalByCurrency[e.currency] = (totalByCurrency[e.currency] || 0) + e.amount;
                    });
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
                          {Object.entries(totalByCurrency).length > 0 ? (
                            Object.entries(totalByCurrency).map(([curr, total]) => (
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
                  {allExpenses && allExpenses.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {allExpenses.map((exp) => {
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
                      <p>لا توجد مصروفات مسجلة</p>
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
