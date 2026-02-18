import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema, type InsertAppointment, type Patient } from "@shared/schema";
import { useCreateAppointment, useAppointments } from "@/hooks/use-appointments";
import { usePatients } from "@/hooks/use-patients";
import { Layout } from "@/components/Layout";
import { format, addDays, setHours, setMinutes } from "date-fns";
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

const ALLOWED_DAYS = [0, 1, 4, 6];
const START_HOUR = 12;
const END_HOUR = 21;
const SLOT_DURATION = 30;

export default function Booking() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined;
  const { data: existingAppointments, isLoading: isLoadingSlots } = useAppointments(formattedDate);
  const { data: patients } = usePatients();
  const { mutate: createAppointment, isPending } = useCreateAppointment();

  const sortedAppointments = existingAppointments?.filter(apt => apt.status !== 'cancelled').sort((a, b) => 
    a.startTime.localeCompare(b.startTime)
  ) || [];

  const form = useForm<InsertAppointment>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      patientName: "",
      phone: "",
      service: "عام",
      notes: "",
      date: formattedDate || "",
      startTime: "",
      endTime: "",
      status: "scheduled"
    },
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredPatients = patients?.filter((p: Patient) =>
    patientSearch.length >= 2 && p.fullName.includes(patientSearch)
  ) || [];

  const selectPatient = (patient: Patient) => {
    form.setValue("patientName", patient.fullName);
    form.setValue("phone", patient.phone);
    form.setValue("patientId", patient.id);
    setPatientSearch(patient.fullName);
    setShowSuggestions(false);
  };

  const generateTimeSlots = () => {
    const slots = [];
    let currentTime = setMinutes(setHours(new Date(), START_HOUR), 0);
    const endTime = setMinutes(setHours(new Date(), END_HOUR), 0);

    while (currentTime < endTime) {
      const timeString = format(currentTime, "HH:mm");
      const isTaken = existingAppointments?.some(apt => {
        if (apt.status === 'cancelled') return false;
        const slotMin = parseInt(timeString.split(":")[0]) * 60 + parseInt(timeString.split(":")[1]);
        const startMin = parseInt(apt.startTime.split(":")[0]) * 60 + parseInt(apt.startTime.split(":")[1]);
        const endMin = parseInt(apt.endTime.split(":")[0]) * 60 + parseInt(apt.endTime.split(":")[1]);
        return slotMin >= startMin && slotMin < endMin;
      });
      slots.push({ time: timeString, available: !isTaken });
      currentTime = new Date(currentTime);
      currentTime.setMinutes(currentTime.getMinutes() + SLOT_DURATION);
    }
    return slots;
  };

  const timeSlots = selectedDate ? generateTimeSlots() : [];

  const toMinutes = (t: string) => parseInt(t.split(":")[0]) * 60 + parseInt(t.split(":")[1]);

  const handleTimeSelect = (time: string) => {
    setSelectedSlots(prev => {
      if (prev.includes(time)) {
        const timeMin = toMinutes(time);
        return prev.filter(t => {
          const tMin = toMinutes(t);
          return t === time ? false : tMin < timeMin;
        });
      }
      if (prev.length === 0) return [time];
      const allSlots = [...prev, time].sort();
      const firstMin = toMinutes(allSlots[0]);
      const lastMin = toMinutes(allSlots[allSlots.length - 1]);
      const filled: string[] = [];
      for (let m = firstMin; m <= lastMin; m += SLOT_DURATION) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const slot = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
        const slotInfo = timeSlots.find(s => s.time === slot);
        if (slotInfo && !slotInfo.available && !prev.includes(slot)) {
          return prev;
        }
        filled.push(slot);
      }
      return filled;
    });
  };

  useEffect(() => {
    if (selectedSlots.length > 0) {
      const sorted = [...selectedSlots].sort();
      const firstSlot = sorted[0];
      const lastSlot = sorted[sorted.length - 1];
      
      const [lastH, lastM] = lastSlot.split(":").map(Number);
      const endDate = new Date();
      endDate.setHours(lastH, lastM + SLOT_DURATION);
      
      form.setValue("date", format(selectedDate!, "yyyy-MM-dd"));
      form.setValue("startTime", firstSlot);
      form.setValue("endTime", format(endDate, "HH:mm"));
    }
  }, [selectedSlots, selectedDate]);

  const getEndTimeDisplay = () => {
    if (selectedSlots.length === 0) return "";
    const sorted = [...selectedSlots].sort();
    const lastSlot = sorted[sorted.length - 1];
    const [h, m] = lastSlot.split(":").map(Number);
    const end = new Date();
    end.setHours(h, m + SLOT_DURATION);
    return format(end, "HH:mm");
  };

  const onSubmit = (data: InsertAppointment) => {
    createAppointment(data, {
      onSuccess: () => {
        form.reset({
          patientName: "",
          phone: "",
          service: "عام",
          notes: "",
          date: formattedDate || "",
          startTime: "",
          endTime: "",
          status: "scheduled"
        });
        setSelectedSlots([]);
        setPatientSearch("");
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
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedSlots([]);
                }}
                disabled={(date) => !ALLOWED_DAYS.includes(date.getDay()) || date < new Date(new Date().setHours(0,0,0,0))}
                className="rounded-md w-full flex justify-center p-4"
                dir="ltr"
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
                    {selectedSlots.length > 1 && (
                      <span className="block text-primary font-medium mt-1">
                        يمكنك اختيار أكثر من وقت لنفس المريض
                      </span>
                    )}
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
                          data-testid={`slot-${slot.time}`}
                          className={cn(
                            "px-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
                            selectedSlots.includes(slot.time)
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
                            <span className="font-bold text-primary font-mono">
                              {apt.startTime}
                              {apt.endTime !== apt.startTime && ` - ${apt.endTime}`}
                            </span>
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
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
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

        <div className="lg:col-span-2">
          <Card className="border-0 shadow-xl shadow-slate-200/60 h-full">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-xl font-tajawal">حجز موعد جديد</CardTitle>
              <CardDescription>أدخل بيانات المريض لإتمام عملية الحجز</CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
              {selectedSlots.length === 0 ? (
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
                          <div className="relative" ref={suggestionsRef}>
                            <FormControl>
                              <Input
                                placeholder="أدخل اسم المريض الكامل"
                                className="h-12 bg-slate-50"
                                data-testid="input-patient-name"
                                value={patientSearch}
                                onChange={(e) => {
                                  setPatientSearch(e.target.value);
                                  field.onChange(e.target.value);
                                  setShowSuggestions(true);
                                }}
                                onFocus={() => {
                                  if (patientSearch.length >= 2) setShowSuggestions(true);
                                }}
                              />
                            </FormControl>
                            {showSuggestions && filteredPatients.length > 0 && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {filteredPatients.map((patient: Patient) => (
                                  <button
                                    key={patient.id}
                                    type="button"
                                    className="w-full text-right px-4 py-3 hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0 transition-colors"
                                    data-testid={`patient-suggestion-${patient.id}`}
                                    onClick={() => selectPatient(patient)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <User className="w-4 h-4 text-primary" />
                                      <span className="font-medium">{patient.fullName}</span>
                                    </div>
                                    <span className="text-xs text-slate-400 dir-ltr">{patient.phone}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم الهاتف</FormLabel>
                          <div className="flex gap-2">
                            <Select 
                              defaultValue="972" 
                              onValueChange={(val) => {
                                const current = field.value || "";
                                if (current.startsWith("972") || current.startsWith("970")) {
                                  field.onChange(val + current.substring(3));
                                } else if (current.startsWith("0")) {
                                  field.onChange(val + current.substring(1));
                                } else {
                                  field.onChange(val + current);
                                }
                              }}
                            >
                              <SelectTrigger className="w-[120px] h-12 bg-slate-50" data-testid="select-phone-prefix">
                                <SelectValue placeholder="المقدمة" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="970">+970</SelectItem>
                                <SelectItem value="972">+972</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormControl>
                              <Input 
                                placeholder="5xxxxxxxx" 
                                {...field} 
                                className="h-12 bg-slate-50 flex-1" 
                                dir="ltr"
                                data-testid="input-phone"
                                onChange={(e) => {
                                  let val = e.target.value.replace(/\D/g, "");
                                  field.onChange(val);
                                }}
                              />
                            </FormControl>
                          </div>
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
                              data-testid="input-notes"
                              {...field} 
                              value={field.value || ''} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="hidden">
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
                          الوقت: {selectedSlots.sort().join(" ، ")} 
                          {selectedSlots.length > 0 && (
                            <span> (من {selectedSlots.sort()[0]} إلى {getEndTimeDisplay()})</span>
                          )}
                          <br />
                          المدة: {selectedSlots.length * SLOT_DURATION} دقيقة
                        </p>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-14 text-xl font-bold shadow-lg shadow-primary/25" 
                      disabled={isPending}
                      data-testid="button-submit-booking"
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
