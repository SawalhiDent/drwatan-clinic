import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema, type InsertAppointment } from "@shared/schema";
import { useCreateAppointment, useAppointments } from "@/hooks/use-appointments";
import { Layout } from "@/components/Layout";
import { format, addDays, isSameDay, setHours, setMinutes } from "date-fns";
import { arSA } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { sendWhatsAppMessage, WHATSAPP_TEMPLATES } from "@/lib/whatsapp";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, Calendar as CalendarIcon, Loader2, CheckCircle2, User, Phone, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Booking Constraints
const ALLOWED_DAYS = [0, 1, 4, 6]; // Sun, Mon, Thu, Sat
const START_HOUR = 12;
const END_HOUR = 21;
const SLOT_DURATION = 30; // minutes

export default function Booking() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Fetch existing appointments for the selected date to block slots
  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined;
  const { data: existingAppointments, isLoading: isLoadingSlots } = useAppointments(formattedDate);
  const { mutate: createAppointment, isPending } = useCreateAppointment();

  const sortedAppointments = existingAppointments?.filter(apt => apt.status !== 'cancelled').sort((a, b) => 
    a.startTime.localeCompare(b.startTime)
  ) || [];

  const form = useForm<InsertAppointment>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      patientName: "",
      phone: "",
      service: "",
      notes: "",
      date: formattedDate || "",
      startTime: "",
      endTime: "",
      status: "scheduled"
    },
  });

  // Generate time slots
  const generateTimeSlots = () => {
    const slots = [];
    let currentTime = setMinutes(setHours(new Date(), START_HOUR), 0);
    const endTime = setMinutes(setHours(new Date(), END_HOUR), 0);

    while (currentTime < endTime) {
      const timeString = format(currentTime, "HH:mm");
      
      // Check if slot is taken
      const isTaken = existingAppointments?.some(apt => apt.startTime === timeString && apt.status !== 'cancelled');
      
      slots.push({
        time: timeString,
        available: !isTaken
      });
      currentTime = addDays(currentTime, 0); // Hack to clone
      currentTime.setMinutes(currentTime.getMinutes() + SLOT_DURATION);
    }
    return slots;
  };

  const timeSlots = selectedDate ? generateTimeSlots() : [];

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    form.setValue("date", format(selectedDate!, "yyyy-MM-dd"));
    form.setValue("startTime", time);
    
    // Calculate end time
    const [hours, minutes] = time.split(":").map(Number);
    const endDate = new Date();
    endDate.setHours(hours, minutes + SLOT_DURATION);
    form.setValue("endTime", format(endDate, "HH:mm"));
  };

  const onSubmit = (data: InsertAppointment) => {
    createAppointment(data, {
      onSuccess: () => {
        form.reset();
        setSelectedTime(null);
      }
    });
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-tajawal text-slate-900">حجز موعد جديد</h1>
        <p className="text-slate-500 mt-2">اختر التاريخ والوقت المناسب لحجز الموعد.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Calendar & Time Slots */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-0 shadow-lg shadow-slate-200/50 overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarIcon className="w-5 h-5 text-primary" />
                اختيار التاريخ
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => !ALLOWED_DAYS.includes(date.getDay()) || date < new Date(new Date().setHours(0,0,0,0))}
                className="rounded-md w-full flex justify-center p-4"
                dir="ltr" // Calendar lib often works better in LTR structure visually
                locale={arSA}
              />
            </CardContent>
          </Card>

          {selectedDate && (
            <div className="space-y-6">
              <Card className="border-0 shadow-lg shadow-slate-200/50">
                <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="w-5 h-5 text-primary" />
                    الأوقات المتاحة
                  </CardTitle>
                  <CardDescription>
                    {format(selectedDate, "EEEE, d MMMM yyyy", { locale: arSA })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  {isLoadingSlots ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => handleTimeSelect(slot.time)}
                          className={cn(
                            "px-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
                            selectedTime === slot.time
                              ? "bg-primary text-white border-primary shadow-md transform scale-105"
                              : slot.available
                              ? "bg-white text-slate-700 border-slate-200 hover:border-primary hover:text-primary"
                              : "bg-slate-100 text-slate-400 border-transparent cursor-not-allowed decoration-slate-400 line-through"
                          )}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Existing Appointments for the day */}
              <Card className="border-0 shadow-lg shadow-slate-200/50">
                <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    المواعيد المحجوزة
                  </CardTitle>
                  <CardDescription>
                    {sortedAppointments.length} مواعيد مؤكدة اليوم
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                  {isLoadingSlots ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : sortedAppointments.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <p className="text-sm">لا توجد مواعيد محجوزة بعد</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {sortedAppointments.map((apt) => (
                        <div key={apt.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-primary font-mono">{apt.startTime}</span>
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="font-medium truncate max-w-[120px]">{apt.patientName}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {apt.phone && apt.phone !== "000" && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => {
                                  const template = WHATSAPP_TEMPLATES.find(t => t.id === 'reminder');
                                  if (template) {
                                    sendWhatsAppMessage(apt.phone, template.message(apt.patientName, apt.date, apt.startTime));
                                  }
                                }}
                              >
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                            )}
                            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-100 text-[10px]">
                              محجوز
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right Column: Booking Form */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-xl shadow-slate-200/60 h-full">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-xl font-tajawal">حجز موعد جديد</CardTitle>
              <CardDescription>أدخل بيانات المريض لإتمام عملية الحجز</CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
              {!selectedTime ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <Clock className="w-12 h-12 mb-3 opacity-20" />
                  <p>يرجى اختيار التاريخ والوقت أولاً للمتابعة</p>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="patientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم المريض</FormLabel>
                          <FormControl>
                            <Input placeholder="أدخل اسم المريض الكامل" {...field} className="h-12 bg-slate-50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ملاحظات</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="أضف أي ملاحظات هنا..." 
                              className="bg-slate-50 min-h-[120px]" 
                              {...field} 
                              value={field.value || ''} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Hidden but required fields for the backend */}
                    <div className="hidden">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} value={field.value || "000"} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="service"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} value={field.value || "عام"} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 border border-blue-100">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-blue-900 text-sm">ملخص الموعد</h4>
                        <p className="text-blue-700 text-sm mt-1">
                          التاريخ: {format(selectedDate!, "yyyy-MM-dd")} <br />
                          الوقت: {selectedTime}
                        </p>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-14 text-xl font-bold shadow-lg shadow-primary/25" 
                      disabled={isPending}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="ml-2 h-6 w-6 animate-spin" />
                          جاري الحجز...
                        </>
                      ) : (
                        "إتمام عملية الحجز"
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
