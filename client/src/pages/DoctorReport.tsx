import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns";
import { arSA } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Calendar, CalendarDays, TrendingUp, ChevronRight, ChevronLeft, UserCircle2, Banknote, Percent, FileDown, Send, Stethoscope, CheckCircle2, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DailyEntry, DoctorSettlement } from "@shared/schema";

type Doctor = {
  id: number;
  displayName: string;
  role: string;
  phone: string | null;
  salary: number | null;
  commissionRate: number | null;
};

export default function DoctorReport() {
  const { toast } = useToast();
  const { data: doctors, isLoading: doctorsLoading } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
  });

  const [selectedDoctorName, setSelectedDoctorName] = useState<string>("");
  const [view, setView] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [dayOffset, setDayOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementCurrency, setSettlementCurrency] = useState("₪");
  const [settlementNotes, setSettlementNotes] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  const selectedDay = useMemo(() => subDays(new Date(), dayOffset), [dayOffset]);
  const selectedWeekStart = useMemo(() => startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 6 }), [weekOffset]);
  const selectedWeekEnd = useMemo(() => endOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 6 }), [weekOffset]);
  const selectedMonthDate = useMemo(() => subMonths(new Date(), monthOffset), [monthOffset]);
  const selectedMonthStart = useMemo(() => startOfMonth(selectedMonthDate), [selectedMonthDate]);
  const selectedMonthEnd = useMemo(() => endOfMonth(selectedMonthDate), [selectedMonthDate]);

  const periodDates = useMemo(() => {
    if (view === "daily") return { from: format(selectedDay, "yyyy-MM-dd"), to: format(selectedDay, "yyyy-MM-dd") };
    if (view === "weekly") return { from: format(selectedWeekStart, "yyyy-MM-dd"), to: format(selectedWeekEnd, "yyyy-MM-dd") };
    return { from: format(selectedMonthStart, "yyyy-MM-dd"), to: format(selectedMonthEnd, "yyyy-MM-dd") };
  }, [view, selectedDay, selectedWeekStart, selectedWeekEnd, selectedMonthStart, selectedMonthEnd]);

  const dateQueryParam = useMemo(() => {
    if (view === "daily") return `date=${periodDates.from}`;
    return `from=${periodDates.from}&to=${periodDates.to}`;
  }, [view, periodDates]);

  const { data: allEntries = [], isLoading: entriesLoading } = useQuery<DailyEntry[]>({
    queryKey: [`/api/daily-entries/range?${dateQueryParam}`],
  });

  const settlementUrl = selectedDoctorName
    ? `/api/doctor-settlements?doctor=${encodeURIComponent(selectedDoctorName)}&from=${periodDates.from}&to=${periodDates.to}`
    : null;

  const { data: periodSettlements = [] } = useQuery<DoctorSettlement[]>({
    queryKey: [settlementUrl],
    enabled: !!settlementUrl,
  });

  const selectedDoctor = useMemo(() => {
    if (!doctors || !selectedDoctorName) return null;
    return doctors.find(d => d.displayName === selectedDoctorName) || null;
  }, [doctors, selectedDoctorName]);

  const isAssistant = selectedDoctor?.role === "assistant";

  const doctorEntries = useMemo(() => {
    if (!selectedDoctorName) return [];
    return allEntries.filter(e => e.doctor === selectedDoctorName);
  }, [allEntries, selectedDoctorName]);

  const summary = useMemo(() => {
    const byCurrency: Record<string, { total: number; count: number; cashTotal: number; checkTotal: number }> = {};
    doctorEntries.forEach(e => {
      const curr = e.currency || "₪";
      if (!byCurrency[curr]) byCurrency[curr] = { total: 0, count: 0, cashTotal: 0, checkTotal: 0 };
      const amt = e.amount || 0;
      byCurrency[curr].total += amt;
      byCurrency[curr].count += 1;
      if (e.paymentMethod === "check") {
        byCurrency[curr].checkTotal += amt;
      } else {
        byCurrency[curr].cashTotal += amt;
      }
    });
    return byCurrency;
  }, [doctorEntries]);

  const commissionByCurrency = useMemo(() => {
    if (!selectedDoctor || !selectedDoctor.commissionRate) return {};
    const rate = selectedDoctor.commissionRate / 100;
    const result: Record<string, number> = {};
    Object.entries(summary).forEach(([curr, data]) => {
      result[curr] = Math.round(data.total * rate);
    });
    return result;
  }, [summary, selectedDoctor]);

  const totalDueByCurrency = useMemo(() => {
    const result: Record<string, number> = {};
    const salaryPerCurrency = selectedDoctor?.salary || 0;
    Object.entries(commissionByCurrency).forEach(([curr, commission]) => {
      result[curr] = commission;
    });
    if (salaryPerCurrency > 0) {
      result["₪"] = (result["₪"] || 0) + salaryPerCurrency;
    }
    return result;
  }, [commissionByCurrency, selectedDoctor]);

  const periodLabel = useMemo(() => {
    if (view === "daily") return format(selectedDay, "EEEE d MMMM yyyy", { locale: arSA });
    if (view === "weekly") return `${format(selectedWeekStart, "d MMM", { locale: arSA })} — ${format(selectedWeekEnd, "d MMM yyyy", { locale: arSA })}`;
    return format(selectedMonthDate, "MMMM yyyy", { locale: arSA });
  }, [view, selectedDay, selectedWeekStart, selectedWeekEnd, selectedMonthDate]);

  const isSettled = periodSettlements.length > 0;

  const createSettlementMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/doctor-settlements", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [settlementUrl] });
      setShowSettlementDialog(false);
      setSettlementAmount("");
      setSettlementNotes("");
      toast({ title: "تم تسجيل التسليم بنجاح", description: "تم حفظ عملية الدفع وإضافتها للمصروفات" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في تسجيل التسليم", variant: "destructive" });
    },
  });

  const deleteSettlementMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/doctor-settlements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [settlementUrl] });
      toast({ title: "تم حذف التسليم" });
    },
  });

  function handleSettlement() {
    if (!selectedDoctor || !settlementAmount) return;

    const parsedAmount = parseInt(settlementAmount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: "خطأ", description: "أدخل مبلغاً صحيحاً أكبر من صفر", variant: "destructive" });
      return;
    }

    const mainCurrency = settlementCurrency;
    const totalDue = totalDueByCurrency[mainCurrency] || 0;
    const totalRev = summary[mainCurrency]?.total || 0;
    const comm = commissionByCurrency[mainCurrency] || 0;

    createSettlementMutation.mutate({
      doctorName: selectedDoctorName,
      periodFrom: periodDates.from,
      periodTo: periodDates.to,
      periodType: view,
      totalRevenue: totalRev,
      commission: comm,
      salary: selectedDoctor.salary || 0,
      totalDue: totalDue,
      amountPaid: parsedAmount,
      currency: mainCurrency,
      notes: settlementNotes || null,
    });
  }

  function openSettlementDialog() {
    const currencies = Object.keys(totalDueByCurrency);
    const mainCurrency = currencies.includes("₪") ? "₪" : (currencies[0] || "₪");
    const totalDue = totalDueByCurrency[mainCurrency] || 0;
    setSettlementCurrency(mainCurrency);
    setSettlementAmount(String(totalDue));
    setSettlementNotes("");
    setShowSettlementDialog(true);
  }

  function generatePdfContent() {
    if (!selectedDoctor || !reportRef.current) return "";

    let text = `تقرير مالي - ${selectedDoctor.displayName}\n`;
    text += `الفترة: ${periodLabel}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `عدد المعالجات: ${doctorEntries.length}\n\n`;

    Object.entries(summary).forEach(([curr, data]) => {
      text += `إجمالي الإيرادات (${curr}): ${data.total.toLocaleString()} ${curr}\n`;
      text += `  كاش: ${data.cashTotal.toLocaleString()} ${curr}\n`;
      text += `  شيكات: ${data.checkTotal.toLocaleString()} ${curr}\n`;
    });

    text += `\n`;
    if (selectedDoctor.salary && selectedDoctor.salary > 0) {
      text += `الراتب الثابت: ${selectedDoctor.salary.toLocaleString()} ₪\n`;
    }
    if (selectedDoctor.commissionRate && selectedDoctor.commissionRate > 0) {
      text += `نسبة العمولة: ${selectedDoctor.commissionRate}%\n`;
      Object.entries(commissionByCurrency).forEach(([curr, amt]) => {
        text += `العمولة (${curr}): ${amt.toLocaleString()} ${curr}\n`;
      });
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    Object.entries(totalDueByCurrency).forEach(([curr, amt]) => {
      text += `المستحق (${curr}): ${amt.toLocaleString()} ${curr}\n`;
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `تفاصيل المعالجات:\n\n`;

    doctorEntries.forEach((e, i) => {
      const method = e.paymentMethod === "check" ? "شيك" : e.paymentMethod === "visa" ? "فيزا" : e.paymentMethod === "bpay" ? "بييت" : "كاش";
      text += `${i + 1}. ${e.patientName} - ${e.treatment || "—"} - ${(e.amount || 0).toLocaleString()} ${e.currency || "₪"} (${method}) - ${e.date}\n`;
    });

    return text;
  }

  async function handleExportPdf() {
    if (!selectedDoctor || !reportRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const entries = doctorEntries.map((e, i) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${i + 1}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${e.date}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${e.patientName}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${e.treatment || "—"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${(e.amount || 0).toLocaleString()} ${e.currency || "₪"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${e.paymentMethod === "check" ? "شيك" : e.paymentMethod === "visa" ? "فيزا" : e.paymentMethod === "bpay" ? "بييت" : "كاش"}</td>
      </tr>
    `).join("");

    let summaryRows = "";
    Object.entries(summary).forEach(([curr, data]) => {
      summaryRows += `
        <tr>
          <td style="padding:6px 10px">إجمالي الإيرادات (${curr})</td>
          <td style="padding:6px 10px;font-weight:bold">${data.total.toLocaleString()} ${curr}</td>
        </tr>
        <tr>
          <td style="padding:6px 10px;padding-right:30px">كاش</td>
          <td style="padding:6px 10px">${data.cashTotal.toLocaleString()} ${curr}</td>
        </tr>
        <tr>
          <td style="padding:6px 10px;padding-right:30px">شيكات</td>
          <td style="padding:6px 10px">${data.checkTotal.toLocaleString()} ${curr}</td>
        </tr>
      `;
    });

    if (selectedDoctor.salary && selectedDoctor.salary > 0) {
      summaryRows += `<tr><td style="padding:6px 10px">الراتب الثابت</td><td style="padding:6px 10px">${selectedDoctor.salary.toLocaleString()} ₪</td></tr>`;
    }
    if (selectedDoctor.commissionRate && selectedDoctor.commissionRate > 0) {
      summaryRows += `<tr><td style="padding:6px 10px">نسبة العمولة</td><td style="padding:6px 10px">${selectedDoctor.commissionRate}%</td></tr>`;
      Object.entries(commissionByCurrency).forEach(([curr, amt]) => {
        summaryRows += `<tr><td style="padding:6px 10px">مبلغ العمولة (${curr})</td><td style="padding:6px 10px;font-weight:bold;color:#059669">${amt.toLocaleString()} ${curr}</td></tr>`;
      });
    }

    let totalRows = "";
    Object.entries(totalDueByCurrency).forEach(([curr, amt]) => {
      totalRows += `<tr><td style="padding:8px 10px;font-weight:bold;font-size:16px">إجمالي المستحق (${curr})</td><td style="padding:8px 10px;font-weight:bold;font-size:18px;color:#7c3aed">${amt.toLocaleString()} ${curr}</td></tr>`;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>تقرير مالي - ${selectedDoctor.displayName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 30px; color: #1e293b; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #8B2342; padding-bottom: 20px; }
          .header h1 { color: #8B2342; font-size: 24px; margin-bottom: 5px; }
          .header p { color: #64748b; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f1f5f9; padding: 8px 10px; text-align: right; font-size: 13px; color: #475569; }
          .section-title { font-size: 16px; font-weight: bold; color: #8B2342; margin: 20px 0 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
          .total-box { background: #f8fafc; border: 2px solid #8B2342; border-radius: 8px; padding: 15px; margin-top: 20px; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>عيادة صوالحي دنت</h1>
          <p>تقرير مالي - ${selectedDoctor.displayName}</p>
          <p>الفترة: ${periodLabel}</p>
        </div>

        <div class="section-title">ملخص مالي</div>
        <table>
          ${summaryRows}
        </table>

        <div class="total-box">
          <table>
            ${totalRows}
          </table>
        </div>

        <div class="section-title">تفاصيل المعالجات (${doctorEntries.length})</div>
        <table>
          <thead>
            <tr>
              <th style="text-align:center">#</th>
              <th>التاريخ</th>
              <th>المريض</th>
              <th>العلاج</th>
              <th style="text-align:center">المبلغ</th>
              <th style="text-align:center">طريقة الدفع</th>
            </tr>
          </thead>
          <tbody>
            ${entries}
          </tbody>
        </table>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  function generateWhatsAppMessage() {
    if (!selectedDoctor) return "";

    let text = `السلام عليكم *${selectedDoctor.displayName}*\n`;
    text += `تقرير مالي من عيادة *صوالحي دنت*\n`;
    text += `━━━━━━━━━━━━━━━\n`;
    text += `الفترة: ${periodLabel}\n`;
    text += `عدد المعالجات: ${doctorEntries.length}\n\n`;

    Object.entries(summary).forEach(([curr, data]) => {
      text += `💰 إجمالي الإيرادات: *${data.total.toLocaleString()} ${curr}*\n`;
      if (data.cashTotal > 0) text += `  كاش: ${data.cashTotal.toLocaleString()} ${curr}\n`;
      if (data.checkTotal > 0) text += `  شيكات: ${data.checkTotal.toLocaleString()} ${curr}\n`;
    });

    if (selectedDoctor.salary && selectedDoctor.salary > 0) {
      text += `\n📋 الراتب الثابت: *${selectedDoctor.salary.toLocaleString()} ₪*\n`;
    }
    if (selectedDoctor.commissionRate && selectedDoctor.commissionRate > 0) {
      text += `📊 نسبة العمولة: *${selectedDoctor.commissionRate}%*\n`;
      Object.entries(commissionByCurrency).forEach(([curr, amt]) => {
        text += `مبلغ العمولة: *${amt.toLocaleString()} ${curr}*\n`;
      });
    }

    text += `\n━━━━━━━━━━━━━━━\n`;
    Object.entries(totalDueByCurrency).forEach(([curr, amt]) => {
      text += `✅ إجمالي المستحق: *${amt.toLocaleString()} ${curr}*\n`;
    });

    text += `\nنتمنى لك دوام التوفيق.`;
    return text;
  }

  function handleSendWhatsApp() {
    if (!selectedDoctor?.phone) return;
    const text = generateWhatsAppMessage();
    sendWhatsAppMessage(selectedDoctor.phone, text);
  }

  const isLoading = doctorsLoading || entriesLoading;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-tajawal text-slate-900" data-testid="text-doctor-report-title">جرد الأطباء والمساعدين</h1>
            <p className="text-slate-500 mt-1 text-sm">تقرير مالي مفصّل لكل طبيب ومساعد مع إمكانية التصدير والإرسال</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[200px]">
            <Select value={selectedDoctorName} onValueChange={setSelectedDoctorName}>
              <SelectTrigger data-testid="select-doctor-report">
                <SelectValue placeholder="اختر الطبيب أو المساعد" />
              </SelectTrigger>
              <SelectContent>
                {(doctors || []).map(doc => (
                  <SelectItem key={doc.id} value={doc.displayName}>
                    {doc.displayName}
                    {doc.role === "assistant" && <span className="text-xs text-slate-400 mr-1">(مساعد)</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant={view === "daily" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("daily")}
              data-testid="button-doctor-daily"
            >
              <Calendar className="ml-1 w-4 h-4" />
              يومي
            </Button>
            <Button
              variant={view === "weekly" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("weekly")}
              data-testid="button-doctor-weekly"
            >
              <TrendingUp className="ml-1 w-4 h-4" />
              أسبوعي
            </Button>
            <Button
              variant={view === "monthly" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("monthly")}
              data-testid="button-doctor-monthly"
            >
              <CalendarDays className="ml-1 w-4 h-4" />
              شهري
            </Button>
          </div>

          {selectedDoctorName && (
            <div className="flex gap-2 mr-auto">
              <Button variant="outline" size="sm" onClick={handleExportPdf} data-testid="button-export-pdf">
                <FileDown className="ml-1 w-4 h-4" />
                تصدير PDF
              </Button>
              {selectedDoctor?.phone && (
                <Button variant="outline" size="sm" onClick={handleSendWhatsApp} className="text-green-600 border-green-200" data-testid="button-send-whatsapp">
                  <Send className="ml-1 w-4 h-4" />
                  إرسال واتساب
                </Button>
              )}
              {!isSettled ? (
                <Button
                  size="sm"
                  onClick={openSettlementDialog}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  data-testid="button-mark-settled"
                >
                  <CheckCircle2 className="ml-1 w-4 h-4" />
                  تم التسليم
                </Button>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-3 py-1.5 text-sm gap-1" data-testid="badge-settled">
                  <CheckCircle2 className="w-4 h-4" />
                  تم الدفع
                </Badge>
              )}
            </div>
          )}
        </div>

        {view === "daily" && (
          <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100">
            <Button variant="ghost" size="icon" onClick={() => setDayOffset(o => o + 1)} data-testid="button-dr-prev-day">
              <ChevronRight className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center">
              <span className="font-bold text-lg text-slate-800">{format(selectedDay, "EEEE", { locale: arSA })}</span>
              <span className="text-sm text-slate-500 block">{format(selectedDay, "d MMMM yyyy", { locale: arSA })}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setDayOffset(o => Math.max(0, o - 1))} disabled={dayOffset === 0} data-testid="button-dr-next-day">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>
        )}

        {view === "weekly" && (
          <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100">
            <Button variant="ghost" size="icon" onClick={() => setWeekOffset(o => o + 1)} data-testid="button-dr-prev-week">
              <ChevronRight className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center">
              <span className="font-bold text-lg text-slate-800">الأسبوع</span>
              <span className="text-sm text-slate-500 block">
                {format(selectedWeekStart, "d MMM", { locale: arSA })} — {format(selectedWeekEnd, "d MMM yyyy", { locale: arSA })}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setWeekOffset(o => Math.max(0, o - 1))} disabled={weekOffset === 0} data-testid="button-dr-next-week">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>
        )}

        {view === "monthly" && (
          <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100">
            <Button variant="ghost" size="icon" onClick={() => setMonthOffset(o => o + 1)} data-testid="button-dr-prev-month">
              <ChevronRight className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center">
              <span className="font-bold text-lg text-slate-800">{format(selectedMonthDate, "MMMM", { locale: arSA })}</span>
              <span className="text-sm text-slate-500 block">{format(selectedMonthDate, "yyyy", { locale: arSA })}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setMonthOffset(o => Math.max(0, o - 1))} disabled={monthOffset === 0} data-testid="button-dr-next-month">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>
        )}

        {!selectedDoctorName ? (
          <div className="text-center py-20 text-slate-400">
            <Stethoscope className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-tajawal">اختر طبيباً أو مساعداً لعرض التقرير المالي</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div ref={reportRef} className="flex flex-col gap-4">
            {selectedDoctor && (
              <Card className="border-0 shadow-lg shadow-rose-100/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                      <UserCircle2 className="w-6 h-6 text-rose-700" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800" data-testid="text-doctor-name">
                        {selectedDoctor.displayName}
                        {isAssistant && <span className="text-sm font-normal text-slate-400 mr-2">(مساعد)</span>}
                      </h2>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {selectedDoctor.phone && (
                          <span className="text-sm text-slate-500">{selectedDoctor.phone}</span>
                        )}
                        {(selectedDoctor.salary ?? 0) > 0 && (
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                            <Banknote className="w-3.5 h-3.5 ml-1" />
                            راتب: {selectedDoctor.salary?.toLocaleString()} ₪
                          </Badge>
                        )}
                        {!isAssistant && (selectedDoctor.commissionRate ?? 0) > 0 && (
                          <Badge variant="secondary" className="bg-rose-50 text-rose-800">
                            <Percent className="w-3.5 h-3.5 ml-1" />
                            عمولة: {selectedDoctor.commissionRate}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", isAssistant ? "lg:grid-cols-2" : "lg:grid-cols-4")}>
              {!isAssistant && (
                <Card className="border-0 shadow-lg shadow-slate-200/50">
                  <CardContent className="p-5">
                    <span className="text-xs text-slate-400 block mb-1">عدد المعالجات</span>
                    <span className="text-2xl font-bold text-slate-800" data-testid="text-doctor-entry-count">{doctorEntries.length}</span>
                  </CardContent>
                </Card>
              )}

              {!isAssistant && (
                <Card className="border-0 shadow-lg shadow-green-100/50">
                  <CardContent className="p-5">
                    <span className="text-xs text-slate-400 block mb-1">إجمالي الإيرادات</span>
                    {Object.entries(summary).length > 0 ? (
                      Object.entries(summary).map(([curr, data]) => (
                        <span key={curr} className="text-xl font-bold text-green-600 block" data-testid={`text-doctor-total-${curr}`}>
                          {data.total.toLocaleString()} {curr}
                        </span>
                      ))
                    ) : (
                      <span className="text-xl font-bold text-slate-300">0</span>
                    )}
                  </CardContent>
                </Card>
              )}

              {!isAssistant && (
                <Card className="border-0 shadow-lg shadow-rose-100/50">
                  <CardContent className="p-5">
                    <span className="text-xs text-slate-400 block mb-1">العمولة المستحقة</span>
                    {Object.entries(commissionByCurrency).length > 0 ? (
                      Object.entries(commissionByCurrency).map(([curr, amt]) => (
                        <span key={curr} className="text-xl font-bold text-rose-700 block" data-testid={`text-doctor-commission-${curr}`}>
                          {amt.toLocaleString()} {curr}
                        </span>
                      ))
                    ) : (
                      <span className="text-xl font-bold text-slate-300">0</span>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="border-0 shadow-lg shadow-purple-100/50">
                <CardContent className="p-5">
                  <span className="text-xs text-slate-400 block mb-1">{isAssistant ? "الراتب المستحق" : "إجمالي المستحق"}</span>
                  {Object.entries(totalDueByCurrency).length > 0 ? (
                    Object.entries(totalDueByCurrency).map(([curr, amt]) => (
                      <span key={curr} className="text-xl font-bold text-purple-600 block" data-testid={`text-doctor-due-${curr}`}>
                        {amt.toLocaleString()} {curr}
                      </span>
                    ))
                  ) : (
                    <span className="text-xl font-bold text-slate-300">0</span>
                  )}
                </CardContent>
              </Card>
            </div>

            {isSettled && periodSettlements.length > 0 && (
              <Card className="border-2 border-emerald-200 bg-emerald-50/50 shadow-lg shadow-emerald-100/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-tajawal text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    سجل التسليمات لهذه الفترة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {periodSettlements.map(s => (
                      <div key={s.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-emerald-100" data-testid={`settlement-${s.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Banknote className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <span className="font-bold text-emerald-800 block">
                              تم دفع {s.amountPaid?.toLocaleString()} {s.currency}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <Clock className="w-3 h-3" />
                              {s.createdAt ? format(new Date(s.createdAt), "d MMM yyyy - HH:mm", { locale: arSA }) : "—"}
                            </div>
                            {s.notes && (
                              <span className="text-xs text-slate-500 block mt-0.5">{s.notes}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => deleteSettlementMutation.mutate(s.id)}
                          data-testid={`button-delete-settlement-${s.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!isAssistant && Object.entries(summary).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(summary).map(([curr, data]) => (
                  <Card key={curr} className="border-0 shadow-lg shadow-slate-200/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-500 font-medium">توزيع الدفع ({curr})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.total > 0 ? (
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-600">كاش</span>
                              <span className="font-bold text-green-600">{data.cashTotal.toLocaleString()} {curr} ({Math.round((data.cashTotal / data.total) * 100)}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5">
                              <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(data.cashTotal / data.total) * 100}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-600">شيكات</span>
                              <span className="font-bold text-rose-700">{data.checkTotal.toLocaleString()} {curr} ({Math.round((data.checkTotal / data.total) * 100)}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5">
                              <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${(data.checkTotal / data.total) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm text-center py-4">لا توجد بيانات</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isAssistant && (
            <Card className="border-0 shadow-lg shadow-slate-200/50">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg font-tajawal">تفاصيل المعالجات</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {doctorEntries.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>لا توجد معالجات في هذه الفترة</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {doctorEntries
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((entry, idx) => (
                        <div key={entry.id} className="p-4 flex items-center justify-between gap-3" data-testid={`row-doctor-entry-${entry.id}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                              {idx + 1}
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 text-sm block">{entry.patientName}</span>
                              <span className="text-xs text-slate-400">
                                {entry.treatment || "—"} • {entry.date}
                              </span>
                            </div>
                          </div>
                          <div className="text-left">
                            <span className={cn(
                              "font-bold text-sm block",
                              entry.paymentMethod === "check" ? "text-rose-700" : "text-green-600"
                            )}>
                              {(entry.amount || 0).toLocaleString()} {entry.currency || "₪"}
                            </span>
                            <span className="text-xs text-slate-400">
                              {entry.paymentMethod === "check" ? "شيك" : entry.paymentMethod === "visa" ? "فيزا" : entry.paymentMethod === "bpay" ? "بييت" : "كاش"}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
            )}
          </div>
        )}
      </div>

      <Dialog open={showSettlementDialog} onOpenChange={setShowSettlementDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-tajawal text-xl">تسجيل تسليم المستحقات</DialogTitle>
            <DialogDescription className="text-slate-500">
              سجّل المبلغ الذي تم دفعه {isAssistant ? "للمساعد" : "للطبيب"} {selectedDoctor?.displayName} عن فترة {periodLabel}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              {Object.entries(totalDueByCurrency).map(([curr, amt]) => (
                <div key={curr} className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">المستحق ({curr})</span>
                  <span className="font-bold text-purple-600">{amt.toLocaleString()} {curr}</span>
                </div>
              ))}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">المبلغ المدفوع</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={settlementAmount}
                  onChange={e => setSettlementAmount(e.target.value)}
                  placeholder="أدخل المبلغ"
                  className="flex-1"
                  data-testid="input-settlement-amount"
                />
                <Select value={settlementCurrency} onValueChange={setSettlementCurrency}>
                  <SelectTrigger className="w-20" data-testid="select-settlement-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="₪">₪</SelectItem>
                    <SelectItem value="$">$</SelectItem>
                    <SelectItem value="€">€</SelectItem>
                    <SelectItem value="د.أ">د.أ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">ملاحظات (اختياري)</label>
              <Textarea
                value={settlementNotes}
                onChange={e => setSettlementNotes(e.target.value)}
                placeholder="مثال: تم التسليم نقداً"
                rows={2}
                data-testid="input-settlement-notes"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setShowSettlementDialog(false)} data-testid="button-cancel-settlement">
              إلغاء
            </Button>
            <Button
              onClick={handleSettlement}
              disabled={!settlementAmount || createSettlementMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-confirm-settlement"
            >
              {createSettlementMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-1" />
              ) : (
                <CheckCircle2 className="w-4 h-4 ml-1" />
              )}
              تأكيد التسليم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
