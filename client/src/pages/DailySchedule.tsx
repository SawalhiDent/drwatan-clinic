import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { format, addDays, subDays, getDay } from "date-fns";
import { arSA } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Loader2, Plus, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Pencil, Trash2, ClipboardList, DollarSign } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import type { DailyEntry } from "@shared/schema";
import { AddDailyEntryDialog } from "@/components/AddDailyEntryDialog";

const WORKING_DAYS = [0, 1, 4, 6];
function isWorkingDay(d: Date) { return WORKING_DAYS.includes(getDay(d)); }
function getNextWorkingDay(from: Date) { let d = addDays(from, 1); while (!isWorkingDay(d)) d = addDays(d, 1); return d; }
function getPrevWorkingDay(from: Date) { let d = subDays(from, 1); while (!isWorkingDay(d)) d = subDays(d, 1); return d; }

export default function DailySchedule() {
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(() => {
    const today = new Date();
    return isWorkingDay(today) ? today : getNextWorkingDay(today);
  });
  const formattedDate = format(date, "yyyy-MM-dd");

  const { data: entries, isLoading } = useQuery<DailyEntry[]>({
    queryKey: [`${api.dailyEntries.list.path}?date=${formattedDate}`],
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DailyEntry | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", api.dailyEntries.delete.path.replace(":id", String(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${api.dailyEntries.list.path}?date=${formattedDate}`] });
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      toast({ title: "تم حذف السجل" });
      setDeleteId(null);
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  function openAdd() {
    setEditingEntry(null);
    setShowDialog(true);
  }

  function openEdit(entry: DailyEntry) {
    setEditingEntry(entry);
    setShowDialog(true);
  }

  const totalByCurrency = useMemo(() => {
    const map: Record<string, number> = {};
    (entries || []).forEach((e) => {
      if (e.amount) {
        map[e.currency || "₪"] = (map[e.currency || "₪"] || 0) + e.amount;
      }
    });
    return map;
  }, [entries]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-tajawal text-slate-900" data-testid="text-page-title">الجدول اليومي</h1>
            <p className="text-slate-500 mt-1 text-sm">
              {format(date, "EEEE, d MMMM yyyy", { locale: arSA })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setDate(getNextWorkingDay(date))} data-testid="button-next-day">
              <ChevronRight className="w-5 h-5" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 bg-white shadow-sm border-slate-200 text-slate-700 font-bold" data-testid="button-date-picker">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  {format(date, "EEEE d/M", { locale: arSA })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && isWorkingDay(d) && setDate(d)}
                  initialFocus
                  locale={arSA}
                  dir="rtl"
                  disabled={(d) => !isWorkingDay(d)}
                />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" onClick={() => setDate(getPrevWorkingDay(date))} data-testid="button-prev-day">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <Button onClick={openAdd} data-testid="button-add-entry">
            <Plus className="w-4 h-4 ml-2" />
            إضافة سجل
          </Button>
          {Object.keys(totalByCurrency).length > 0 && (
            <div className="flex items-center gap-3 flex-wrap bg-white rounded-lg px-4 py-2 border border-slate-100 shadow-sm">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm text-slate-500">إجمالي اليوم:</span>
              {Object.entries(totalByCurrency).map(([curr, total]) => (
                <span key={curr} className="font-bold text-green-600" data-testid={`text-daily-total-${curr}`}>
                  {total.toLocaleString()} {curr}
                </span>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardContent className="p-0">
              {(!entries || entries.length === 0) ? (
                <div className="text-center py-16 text-slate-400">
                  <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">لا توجد سجلات لهذا اليوم</p>
                  <p className="text-sm mt-1">اضغط "إضافة سجل" لبدء تسجيل المرضى</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-right font-bold text-slate-700">اسم المريض</TableHead>
                        <TableHead className="text-right font-bold text-slate-700">العلاج</TableHead>
                        <TableHead className="text-right font-bold text-slate-700">الطبيب</TableHead>
                        <TableHead className="text-right font-bold text-slate-700 w-28">المدفوع</TableHead>
                        <TableHead className="text-right font-bold text-slate-700">ملاحظات</TableHead>
                        <TableHead className="text-center font-bold text-slate-700 w-24">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                          <TableCell className="font-bold text-slate-800">{entry.patientName}</TableCell>
                          <TableCell className="text-slate-600">{entry.treatment || "—"}</TableCell>
                          <TableCell className="text-slate-600">{entry.doctor || "—"}</TableCell>
                          <TableCell>
                            {entry.amount ? (
                              <div className="flex flex-col">
                                <span className="font-bold text-green-600">
                                  {entry.amount.toLocaleString()} {entry.currency || "₪"}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {entry.paymentMethod === "check" ? "شيك" : "كاش"}
                                </span>
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm">{entry.notes || "—"}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(entry)}
                                data-testid={`button-edit-entry-${entry.id}`}
                              >
                                <Pencil className="w-4 h-4 text-slate-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(entry.id)}
                                data-testid={`button-delete-entry-${entry.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <AddDailyEntryDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        date={date}
        editingEntry={editingEntry}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-tajawal">حذف السجل</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا السجل؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
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
