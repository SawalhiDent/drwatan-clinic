import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePatients } from "@/hooks/use-patients";
import { Layout } from "@/components/Layout";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, subDays, subWeeks, subMonths } from "date-fns";
import { arSA } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, Banknote, FileText, ChevronRight, ChevronLeft, TrendingUp, TrendingDown, Calendar, CalendarDays, Receipt, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@shared/routes";
import type { Expense, ExpenseCategory, DailyEntry } from "@shared/schema";

type PaymentEntry = {
  amount: number;
  date: string;
  method: "cash" | "check";
  currency: string;
  checkImageUrl?: string;
  patientName?: string;
};

export default function Reports() {
  const { data: patients, isLoading } = usePatients();
  const { data: allExpenses, isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: [api.expenses.list.path],
  });
  const { data: expenseCategories } = useQuery<ExpenseCategory[]>({
    queryKey: [api.expenseCategories.list.path],
  });
  const { data: allDailyEntries } = useQuery<DailyEntry[]>({
    queryKey: [api.dailyEntries.list.path],
  });
  const [view, setView] = useState<"daily" | "weekly" | "monthly">("daily");
  const [dayOffset, setDayOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const allPayments: PaymentEntry[] = useMemo(() => {
    const payments: PaymentEntry[] = [];

    // Include payments from patient records (manual + auto-synced from entries WITH patientId)
    if (patients) {
      patients.forEach((p) => {
        const pPayments = (p.payments as any[]) || [];
        pPayments.forEach((pay) => {
          payments.push({ ...pay, patientName: p.fullName });
        });
      });
    }

    // Include daily entries WITHOUT a linked patient (not synced to any patient record)
    if (allDailyEntries) {
      allDailyEntries.forEach((entry) => {
        if (!entry.patientId && entry.amount && entry.amount > 0) {
          payments.push({
            amount: entry.amount,
            date: entry.date,
            method: (entry.paymentMethod === "check" ? "check" : "cash") as "cash" | "check",
            currency: entry.currency || "₪",
            patientName: entry.patientName,
          });
        }
      });
    }

    return payments;
  }, [patients, allDailyEntries]);

  const selectedDay = useMemo(() => subDays(new Date(), dayOffset), [dayOffset]);
  const selectedWeekStart = useMemo(() => startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 6 }), [weekOffset]);
  const selectedWeekEnd = useMemo(() => endOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 6 }), [weekOffset]);
  const selectedMonthDate = useMemo(() => subMonths(new Date(), monthOffset), [monthOffset]);
  const selectedMonthStart = useMemo(() => startOfMonth(selectedMonthDate), [selectedMonthDate]);
  const selectedMonthEnd = useMemo(() => endOfMonth(selectedMonthDate), [selectedMonthDate]);

  const filterByPeriod = <T extends { date: string }>(items: T[]): T[] => {
    if (view === "daily") {
      const dayStr = format(selectedDay, "yyyy-MM-dd");
      return items.filter((item) => {
        try {
          return format(parseISO(item.date), "yyyy-MM-dd") === dayStr;
        } catch { return false; }
      });
    } else if (view === "weekly") {
      return items.filter((item) => {
        try {
          return isWithinInterval(parseISO(item.date), { start: selectedWeekStart, end: selectedWeekEnd });
        } catch { return false; }
      });
    } else {
      return items.filter((item) => {
        try {
          return isWithinInterval(parseISO(item.date), { start: selectedMonthStart, end: selectedMonthEnd });
        } catch { return false; }
      });
    }
  };

  const activePayments = useMemo(() => filterByPeriod(allPayments), [allPayments, view, selectedDay, selectedWeekStart, selectedWeekEnd, selectedMonthStart, selectedMonthEnd]);
  const activeExpenses = useMemo(() => filterByPeriod(allExpenses || []), [allExpenses, view, selectedDay, selectedWeekStart, selectedWeekEnd, selectedMonthStart, selectedMonthEnd]);

  const cashByCurrency = useMemo(() => {
    const map: Record<string, number> = {};
    activePayments.filter((p) => p.method === "cash").forEach((p) => {
      map[p.currency] = (map[p.currency] || 0) + p.amount;
    });
    return map;
  }, [activePayments]);

  const checkByCurrency = useMemo(() => {
    const map: Record<string, number> = {};
    activePayments.filter((p) => p.method === "check").forEach((p) => {
      map[p.currency] = (map[p.currency] || 0) + p.amount;
    });
    return map;
  }, [activePayments]);

  const totalIncomeByCurrency = useMemo(() => {
    const map: Record<string, number> = {};
    activePayments.forEach((p) => {
      map[p.currency] = (map[p.currency] || 0) + p.amount;
    });
    return map;
  }, [activePayments]);

  const totalExpensesByCurrency = useMemo(() => {
    const map: Record<string, number> = {};
    activeExpenses.forEach((e) => {
      map[e.currency] = (map[e.currency] || 0) + e.amount;
    });
    return map;
  }, [activeExpenses]);

  const netByCurrency = useMemo(() => {
    const currencies = new Set([...Object.keys(totalIncomeByCurrency), ...Object.keys(totalExpensesByCurrency)]);
    const map: Record<string, number> = {};
    currencies.forEach((c) => {
      map[c] = (totalIncomeByCurrency[c] || 0) - (totalExpensesByCurrency[c] || 0);
    });
    return map;
  }, [totalIncomeByCurrency, totalExpensesByCurrency]);

  const expensesByCategory = useMemo(() => {
    const map: Record<number, { name: string; color: string; total: Record<string, number> }> = {};
    activeExpenses.forEach((e) => {
      if (!map[e.categoryId]) {
        const cat = expenseCategories?.find((c) => c.id === e.categoryId);
        map[e.categoryId] = { name: cat?.name || "غير معروف", color: cat?.color || "#6b7280", total: {} };
      }
      map[e.categoryId].total[e.currency] = (map[e.categoryId].total[e.currency] || 0) + e.amount;
    });
    return map;
  }, [activeExpenses, expenseCategories]);

  const cashTotal = activePayments.filter((p) => p.method === "cash").reduce((s, p) => s + p.amount, 0);
  const checkTotal = activePayments.filter((p) => p.method === "check").reduce((s, p) => s + p.amount, 0);

  const dataLoading = isLoading || expensesLoading;

  function getCategoryName(id: number) {
    return expenseCategories?.find((c) => c.id === id)?.name || "غير معروف";
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-tajawal text-slate-900">التقارير المالية</h1>
            <p className="text-slate-500 mt-1 text-sm">عرض ملخص الإيرادات والمصروفات وصافي الربح</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={view === "daily" ? "default" : "outline"}
            onClick={() => setView("daily")}
            data-testid="button-daily-view"
          >
            <Calendar className="ml-2 w-4 h-4" />
            يومي
          </Button>
          <Button
            variant={view === "weekly" ? "default" : "outline"}
            onClick={() => setView("weekly")}
            data-testid="button-weekly-view"
          >
            <TrendingUp className="ml-2 w-4 h-4" />
            أسبوعي
          </Button>
          <Button
            variant={view === "monthly" ? "default" : "outline"}
            onClick={() => setView("monthly")}
            data-testid="button-monthly-view"
          >
            <CalendarDays className="ml-2 w-4 h-4" />
            شهري
          </Button>
        </div>

        {view === "daily" && (
          <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100">
            <Button variant="ghost" size="icon" onClick={() => setDayOffset((o) => o + 1)} data-testid="button-prev-day">
              <ChevronRight className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center">
              <span className="font-bold text-lg text-slate-800">
                {format(selectedDay, "EEEE", { locale: arSA })}
              </span>
              <span className="text-sm text-slate-500 block">
                {format(selectedDay, "d MMMM yyyy", { locale: arSA })}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDayOffset((o) => Math.max(0, o - 1))}
              disabled={dayOffset === 0}
              data-testid="button-next-day"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>
        )}

        {view === "weekly" && (
          <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100">
            <Button variant="ghost" size="icon" onClick={() => setWeekOffset((o) => o + 1)} data-testid="button-prev-week">
              <ChevronRight className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center">
              <span className="font-bold text-lg text-slate-800">الأسبوع</span>
              <span className="text-sm text-slate-500 block">
                {format(selectedWeekStart, "d MMM", { locale: arSA })} — {format(selectedWeekEnd, "d MMM yyyy", { locale: arSA })}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
              disabled={weekOffset === 0}
              data-testid="button-next-week"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>
        )}

        {view === "monthly" && (
          <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100">
            <Button variant="ghost" size="icon" onClick={() => setMonthOffset((o) => o + 1)} data-testid="button-prev-month">
              <ChevronRight className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center">
              <span className="font-bold text-lg text-slate-800">
                {format(selectedMonthDate, "MMMM", { locale: arSA })}
              </span>
              <span className="text-sm text-slate-500 block">
                {format(selectedMonthDate, "yyyy", { locale: arSA })}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
              disabled={monthOffset === 0}
              data-testid="button-next-month"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>
        )}

        {dataLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-0 shadow-lg shadow-green-100/50">
                <CardContent className="p-5 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">إجمالي الكاش</span>
                    {Object.entries(cashByCurrency).length > 0 ? (
                      Object.entries(cashByCurrency).map(([curr, total]) => (
                        <span key={curr} className="text-xl font-bold text-green-600 block" data-testid={`text-cash-${curr}`}>
                          {total.toLocaleString()} {curr}
                        </span>
                      ))
                    ) : (
                      <span className="text-xl font-bold text-slate-300">0</span>
                    )}
                  </div>
                  <div className="bg-green-50 p-3 rounded-full">
                    <Banknote className="w-6 h-6 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg shadow-blue-100/50">
                <CardContent className="p-5 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">إجمالي الشيكات</span>
                    {Object.entries(checkByCurrency).length > 0 ? (
                      Object.entries(checkByCurrency).map(([curr, total]) => (
                        <span key={curr} className="text-xl font-bold text-blue-600 block" data-testid={`text-check-${curr}`}>
                          {total.toLocaleString()} {curr}
                        </span>
                      ))
                    ) : (
                      <span className="text-xl font-bold text-slate-300">0</span>
                    )}
                  </div>
                  <div className="bg-blue-50 p-3 rounded-full">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg shadow-red-100/50">
                <CardContent className="p-5 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">إجمالي المصروفات</span>
                    {Object.entries(totalExpensesByCurrency).length > 0 ? (
                      Object.entries(totalExpensesByCurrency).map(([curr, total]) => (
                        <span key={curr} className="text-xl font-bold text-red-600 block" data-testid={`text-expenses-${curr}`}>
                          {total.toLocaleString()} {curr}
                        </span>
                      ))
                    ) : (
                      <span className="text-xl font-bold text-slate-300">0</span>
                    )}
                  </div>
                  <div className="bg-red-50 p-3 rounded-full">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg shadow-purple-100/50">
                <CardContent className="p-5 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">صافي الربح</span>
                    {Object.entries(netByCurrency).length > 0 ? (
                      Object.entries(netByCurrency).map(([curr, total]) => (
                        <span
                          key={curr}
                          className={cn("text-xl font-bold block", total >= 0 ? "text-purple-600" : "text-red-600")}
                          data-testid={`text-net-${curr}`}
                        >
                          {total.toLocaleString()} {curr}
                        </span>
                      ))
                    ) : (
                      <span className="text-xl font-bold text-slate-300">0</span>
                    )}
                  </div>
                  <div className="bg-purple-50 p-3 rounded-full">
                    <ArrowUpDown className="w-6 h-6 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {Object.keys(expensesByCategory).length > 0 && (
              <Card className="border-0 shadow-lg shadow-slate-200/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500 font-medium">المصروفات حسب القسم</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(expensesByCategory).map(([catId, data]) => (
                      <div key={catId}>
                        <div className="flex justify-between items-center text-sm mb-1 gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                            <span className="text-slate-700 font-medium">{data.name}</span>
                          </div>
                          <div className="flex gap-2">
                            {Object.entries(data.total).map(([curr, total]) => (
                              <span key={curr} className="font-bold text-red-600">
                                {total.toLocaleString()} {curr}
                              </span>
                            ))}
                          </div>
                        </div>
                        {Object.entries(totalExpensesByCurrency).map(([curr]) => {
                          const catTotal = data.total[curr] || 0;
                          const grandTotal = totalExpensesByCurrency[curr] || 1;
                          return (
                            <div key={curr} className="w-full bg-slate-100 rounded-full h-2 mb-1">
                              <div
                                className="h-2 rounded-full transition-all duration-500"
                                style={{ width: `${(catTotal / grandTotal) * 100}%`, backgroundColor: data.color }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-0 shadow-lg shadow-slate-200/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500 font-medium">عدد العمليات</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-6 flex-wrap">
                  <div className="text-center">
                    <span className="text-3xl font-bold text-slate-800" data-testid="text-total-count">{activePayments.length}</span>
                    <span className="text-xs text-slate-400 block">إيرادات</span>
                  </div>
                  <div className="h-10 w-px bg-slate-200" />
                  <div className="text-center">
                    <span className="text-2xl font-bold text-green-600" data-testid="text-cash-count">
                      {activePayments.filter((p) => p.method === "cash").length}
                    </span>
                    <span className="text-xs text-slate-400 block">كاش</span>
                  </div>
                  <div className="h-10 w-px bg-slate-200" />
                  <div className="text-center">
                    <span className="text-2xl font-bold text-blue-600" data-testid="text-check-count">
                      {activePayments.filter((p) => p.method === "check").length}
                    </span>
                    <span className="text-xs text-slate-400 block">شيكات</span>
                  </div>
                  <div className="h-10 w-px bg-slate-200" />
                  <div className="text-center">
                    <span className="text-2xl font-bold text-red-600" data-testid="text-expense-count">
                      {activeExpenses.length}
                    </span>
                    <span className="text-xs text-slate-400 block">مصروفات</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg shadow-slate-200/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500 font-medium">نسبة طرق الدفع</CardTitle>
                </CardHeader>
                <CardContent>
                  {activePayments.length > 0 && (cashTotal + checkTotal) > 0 ? (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1 gap-2">
                          <span className="text-slate-600">كاش</span>
                          <span className="font-bold text-green-600">
                            {Math.round((cashTotal / (cashTotal + checkTotal)) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                          <div
                            className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${(cashTotal / (cashTotal + checkTotal)) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1 gap-2">
                          <span className="text-slate-600">شيكات</span>
                          <span className="font-bold text-blue-600">
                            {Math.round((checkTotal / (cashTotal + checkTotal)) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                          <div
                            className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${(checkTotal / (cashTotal + checkTotal)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm text-center py-4">لا توجد بيانات</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-lg shadow-slate-200/50">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg font-tajawal">تفاصيل الإيرادات</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {activePayments.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>لا توجد إيرادات في هذه الفترة</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {activePayments
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((payment, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between gap-3" data-testid={`row-payment-${idx}`}>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              payment.method === "cash" ? "bg-green-50" : "bg-blue-50"
                            )}>
                              {payment.method === "cash" ? (
                                <Banknote className="w-5 h-5 text-green-600" />
                              ) : (
                                <FileText className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 text-sm block">
                                {payment.patientName || "مريض"}
                              </span>
                              <span className="text-xs text-slate-400">
                                {(() => {
                                  try {
                                    return format(parseISO(payment.date), "d MMM yyyy - HH:mm", { locale: arSA });
                                  } catch {
                                    return payment.date;
                                  }
                                })()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs",
                                payment.method === "cash"
                                  ? "bg-green-50 text-green-700 border-green-100"
                                  : "bg-blue-50 text-blue-700 border-blue-100"
                              )}
                            >
                              {payment.method === "cash" ? "كاش" : "شيك"}
                            </Badge>
                            <span className={cn(
                              "font-bold text-lg",
                              payment.method === "cash" ? "text-green-600" : "text-blue-600"
                            )}>
                              {payment.amount.toLocaleString()} {payment.currency}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {activeExpenses.length > 0 && (
              <Card className="border-0 shadow-lg shadow-slate-200/50">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="text-lg font-tajawal">تفاصيل المصروفات</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {activeExpenses
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((expense) => (
                        <div key={expense.id} className="p-4 flex items-center justify-between gap-3" data-testid={`row-expense-${expense.id}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50">
                              <Receipt className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 text-sm block">
                                {expense.description || getCategoryName(expense.categoryId)}
                              </span>
                              <span className="text-xs text-slate-400">
                                {(() => {
                                  try {
                                    return format(parseISO(expense.date), "d MMM yyyy", { locale: arSA });
                                  } catch {
                                    return expense.date;
                                  }
                                })()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="text-xs bg-red-50 text-red-700 border-red-100">
                              {getCategoryName(expense.categoryId)}
                            </Badge>
                            <span className="font-bold text-lg text-red-600">
                              {expense.amount.toLocaleString()} {expense.currency}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
