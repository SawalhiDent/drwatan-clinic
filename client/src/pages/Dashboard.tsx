import { useState } from "react";
import { useAppointments, useDeleteAppointment } from "@/hooks/use-appointments";
import { Layout } from "@/components/Layout";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarClock, CheckCircle2, XCircle, Clock, Trash2, Loader2, Phone, Calendar as CalendarIcon, User, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLocation } from "wouter";
import { sendWhatsAppMessage, WHATSAPP_TEMPLATES } from "@/lib/whatsapp";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [date, setDate] = useState<Date>(new Date());
  const [, setLocation] = useLocation();
  const formattedDate = format(date, "yyyy-MM-dd");
  const { data: appointments, isLoading } = useAppointments(formattedDate);
  const { mutate: deleteAppointment } = useDeleteAppointment();

  // Sort by start time
  const sortedAppointments = appointments?.sort((a, b) => 
    a.startTime.localeCompare(b.startTime)
  ) || [];

  const stats = {
    total: sortedAppointments.length,
    scheduled: sortedAppointments.filter(a => a.status === 'scheduled').length,
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-tajawal text-slate-900">لوحة التحكم</h1>
          <p className="text-slate-500 mt-2">عرض المواعيد ليوم: {format(date, "EEEE, d MMMM yyyy", { locale: arSA })}</p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-12 px-6 flex items-center gap-2 bg-white shadow-sm hover:bg-slate-50 border-slate-200 text-slate-700 font-bold">
              <CalendarIcon className="w-5 h-5 text-primary" />
              تغيير التاريخ
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              initialFocus
              locale={arSA}
              dir="rtl"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg shadow-blue-500/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-blue-100 font-medium mb-1">إجمالي المواعيد</p>
              <h3 className="text-3xl font-bold">{stats.total}</h3>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <CalendarClock className="w-6 h-6 text-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-slate-500 font-medium mb-1">المواعيد المجدولة</p>
              <h3 className="text-3xl font-bold text-slate-900">{stats.scheduled}</h3>
            </div>
            <div className="bg-yellow-100 p-3 rounded-xl">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointments List */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-xl font-tajawal">جدول المواعيد</CardTitle>
          <CardDescription>عرض الحجوزات ليوم {format(date, "d MMMM yyyy", { locale: arSA })}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : sortedAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <CalendarClock className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">لا توجد مواعيد لهذا اليوم</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-[120px] text-right">الوقت</TableHead>
                  <TableHead className="text-right">المريض</TableHead>
                  <TableHead className="text-right">الخدمة</TableHead>
                  <TableHead className="text-center w-[150px]">الحالة</TableHead>
                  <TableHead className="text-center w-[100px]">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAppointments.map((apt) => (
                  <TableRow key={apt.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-bold text-primary font-mono text-lg">
                      {apt.startTime}
                    </TableCell>
                    <TableCell>
                      <button 
                        onClick={() => setLocation(`/patients?search=${encodeURIComponent(apt.patientName)}`)}
                        className="font-medium text-slate-900 hover:text-primary transition-colors flex items-center gap-2 group"
                      >
                        <User className="w-4 h-4 text-slate-400 group-hover:text-primary" />
                        {apt.patientName}
                      </button>
                      <div className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {apt.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ServiceBadge service={apt.service} />
                      {apt.notes && (
                        <p className="text-xs text-slate-400 mt-1 truncate max-w-[200px]">
                          ملاحظة: {apt.notes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="secondary" 
                        className={
                          apt.status === 'completed' ? "bg-green-100 text-green-700 hover:bg-green-100" :
                          apt.status === 'cancelled' ? "bg-red-100 text-red-700 hover:bg-red-100" :
                          "bg-blue-50 text-blue-700 hover:bg-blue-50"
                        }
                      >
                        {apt.status === 'completed' ? 'تم الإنجاز' : 
                         apt.status === 'cancelled' ? 'ملغي' : 'مجدول'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => {
                            const template = WHATSAPP_TEMPLATES.find(t => t.id === 'reminder');
                            if (template) {
                              sendWhatsAppMessage(apt.phone, template.message(apt.patientName, apt.date, apt.startTime));
                            }
                          }}
                          title="إرسال تذكير واتساب"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-right">هل أنت متأكد؟</AlertDialogTitle>
                            <AlertDialogDescription className="text-right">
                              سيتم إلغاء هذا الموعد نهائياً من الجدول.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row-reverse gap-2">
                            <AlertDialogCancel className="ml-0">تراجع</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteAppointment(apt.id)}
                              className="bg-red-600 hover:bg-red-700 ml-0"
                            >
                              نعم، إلغاء الموعد
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}

function ServiceBadge({ service }: { service: string }) {
  const labels: Record<string, string> = {
    checkup: "كشف عام",
    cleaning: "تنظيف",
    filling: "حشو",
    root_canal: "جذور",
    extraction: "خلع",
  };

  return <span className="font-medium text-slate-700">{labels[service] || service}</span>;
}
