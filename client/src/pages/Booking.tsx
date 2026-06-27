import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema, type InsertAppointment, type Patient, type Appointment } from "@shared/schema";
import { useCreateAppointment, useAppointments, useUpdateAppointment, useDeleteAppointment } from "@/hooks/use-appointments";
import { usePatients } from "@/hooks/use-patients";
import { Layout } from "@/components/Layout";
import { format, setHours, setMinutes, getDay } from "date-fns";
import { arSA } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { WhatsAppTemplatePicker } from "@/components/WhatsAppTemplatePicker";
import { AddDailyEntryDialog } from "@/components/AddDailyEntryDialog";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, Calendar as CalendarIcon, Loader2, CheckCircle2, User, ClipboardList, Pencil, Trash2, Stethoscope, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ALLOWED_DAYS = [0, 1, 2, 3, 4, 5, 6];
const START_HOUR = 10;
const END_HOUR = 21;
const SLOT_DURATION = 30;

const WORKING_DAYS = [0, 1, 2, 3, 4, 5, 6]; // All days available
function isWorkingDay(d: Date) { return WORKING_DAYS.includes(getDay(d)); }

export default function Booking() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [showDailyEntry, setShowDailyEntry] = useState(false);
  const [phonePrefix, setPhonePrefix] = useState("972");
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [editPhonePrefix, setEditPhonePrefix] = useState("972");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editService, setEditService] = useState("عام");
  const [editNotes, setEditNotes] = useState("");

  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined;
  const { data: existingAppointments, isLoading, isFetching } = useAppointments(formattedDate);
  const isLoadingSlots = isLoading || isFetching;
  const { data: patients } = usePatients();
  const { mutate: createAppointment, isPending } = useCreateAppointment();
  const { mutate: updateAppointment, isPending: isUpdating } = useUpdateAppointment();
  const { mutate: deleteAppointment, isPending: isDeleting } = useDeleteAppointment();
  const [deletingAptId, setDeletingAptId] = useState<number | null>(null);

  const openEditDialog = (apt: Appointment) => {
    const rawPhone = (apt.phone || "").replace(/\D/g, "");
    let localNumber = rawPhone;
    let prefix = "972";
    if (rawPhone.startsWith("970")) { prefix = "970"; localNumber = rawPhone.substring(3); }
    else if (rawPhone.startsWith("972")) { localNumber = rawPhone.substring(3); }
    else if (rawPhone.startsWith("0")) { localNumber = rawPhone.substring(1); }
    setEditingApt(apt);
    setEditName(apt.patientName);
    setEditPhone(localNumber);
    setEditPhonePrefix(prefix);
    setEditService(apt.service || "عام");
    setEditNotes(apt.notes || "");
  };

  const submitEdit = () => {
    if (!editingApt) return;
    let phone = editPhone.replace(/\D/g, "");
    if (phone.length > 0) {
      if (phone.startsWith("0")) phone = phone.substring(1);
      if (phone.startsWith("972") || phone.startsWith("970")) phone = editPhonePrefix + phone.substring(3);
      else phone = editPhonePrefix + phone;
    }
    updateAppointment(
      { id: editingApt.id, data: { patientName: editName, phone: phone || "", service: editService, notes: editNotes } },
      { onSuccess: () => setEditingApt(null) }
    );
  };

  const sortedAppointments = existingAppointments?.filter(apt => apt.status !== 'cancelled').sort((a, b) => 
    a.startTime.localeCompare(b.startTime)
  ) || [];

  const form = useForm<InsertAppointment>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      patientName: "",
      phone: "",
      service: "أسنان",
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
    const rawPhone = (patient.phone || "").replace(/\D/g, "");
    let localNumber = rawPhone;
    let detectedPrefix = "972";
    if (rawPhone.startsWith("970")) {
      detectedPrefix = "970";
      localNumber = rawPhone.substring(3);
    } else if (rawPhone.startsWith("972")) {
      detectedPrefix = "972";
      localNumber = rawPhone.substring(3);
    } else if (rawPhone.startsWith("0")) {
      localNumber = rawPhone.substring(1);
    }
    form.setValue("patientName", patient.fullName);
    form.setValue("phone", localNumber);
    form.setValue("patientId", patient.id);
    setPatientSearch(patient.fullName);
    setShowSuggestions(false);
    setPhonePrefix(detectedPrefix);
  };

  const generateTimeSlots = () => {
    const selectedService = form.watch("service") || "أسنان";
    const slots = [];
    let currentTime = setMinutes(setHours(new Date(), START_HOUR), 0);
    const endTime = setMinutes(setHours(new Date(), END_HOUR), 0);

    while (currentTime < endTime) {
      const timeString = format(currentTime, "HH:mm");
      const slotMin = parseInt(timeString.split(":")[0]) * 60 + parseInt(timeString.split(":")[1]);
      // A slot is taken only if an appointment for the SAME service overlaps it
      const isTaken = existingAppointments?.some(apt => {
        if (apt.status === 'cancelled') return false;
        if (apt.service !== selectedService) return false;
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
    let phone = (data.phone || "").replace(/\D/g, "");
    if (phone.length > 0) {
      if (phone.startsWith("0")) {
        phone = phone.substring(1);
      }
      if (phone.startsWith("972") || phone.startsWith("970")) {
        phone = phonePrefix + phone.substring(3);
      } else {
        phone = phonePrefix + phone;
      }
    }
    const submitData = { ...data, phone: phone || "" };
    createAppointment(submitData, {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-tajawal text-slate-900">حجز موعد جديد</h1>
          <p className="text-slate-500 mt-2">اختر التاريخ والوقت المناسب لحجز الموعد.</p>
        </div>
        <Button onClick={() => setShowDailyEntry(true)} variant="outline" className="border-2 border-rose-300 text-rose-700 bg-rose-50/50 hover:bg-rose-100 hover:border-rose-400 shadow-sm" data-testid="button-add-daily-entry">
          <ClipboardList className="w-4 h-4 ml-2" />
          إضافة سجل يومي
        </Button>
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
                          title={!slot.available ? "هذا الوقت محجوز" : undefined}
                          className={cn(
                            "px-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 border relative",
                            selectedSlots.includes(slot.time)
                              ? "bg-primary text-white border-primary shadow-md transform scale-105"
                              : slot.available
                              ? "bg-white text-slate-700 border-slate-200 hover:border-primary hover:text-primary"
                              : "bg-rose-50 text-rose-300 border-rose-200 cursor-not-allowed line-through opacity-70"
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
                        <div key={apt.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors gap-2">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-bold text-primary font-mono text-sm">
                              {apt.startTime}
                              {apt.endTime !== apt.startTime && ` - ${apt.endTime}`}
                            </span>
                            <div className="flex items-center gap-1 text-sm text-slate-700">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="font-medium truncate max-w-[110px]">{apt.patientName}</span>
                            </div>
                            {apt.service && apt.service !== "عام" && (
                              <span className="text-xs text-slate-400 truncate max-w-[130px]">{apt.service}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => openEditDialog(apt)}
                              title="تعديل الموعد"
                              data-testid={`button-edit-apt-${apt.id}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setDeletingAptId(apt.id)}
                              title="حذف الموعد"
                              data-testid={`button-delete-apt-${apt.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            {apt.phone && apt.phone !== "000" && apt.phone.replace(/\D/g, "").length >= 7 && (
                              <WhatsAppTemplatePicker
                                phone={apt.phone}
                                context={{
                                  name: apt.patientName,
                                  date: apt.date,
                                  time: apt.startTime,
                                  service: apt.service,
                                }}
                              />
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
                          <FormLabel>رقم الهاتف <span className="text-slate-400 font-normal text-xs">(اختياري)</span></FormLabel>
                          <div className="flex gap-2">
                            <Select value={phonePrefix} onValueChange={setPhonePrefix}>
                              <SelectTrigger className="w-[120px] h-12 bg-slate-50" data-testid="select-phone-prefix">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="972">+972</SelectItem>
                                <SelectItem value="970">+970</SelectItem>
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

                    <FormField
                      control={form.control}
                      name="service"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نوع العيادة</FormLabel>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => field.onChange("أسنان")}
                              className={cn(
                                "flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all duration-200",
                                field.value === "أسنان"
                                  ? "bg-[#8B2342] text-white border-[#8B2342] shadow-md shadow-[#8B2342]/20"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-[#8B2342] hover:text-[#8B2342]"
                              )}
                              data-testid="button-clinic-dental"
                            >
                              <Stethoscope className="w-4 h-4" />
                              🦷 أسنان
                            </button>
                            <button
                              type="button"
                              onClick={() => field.onChange("تجميل")}
                              className={cn(
                                "flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all duration-200",
                                field.value === "تجميل"
                                  ? "bg-[#8B2342] text-white border-[#8B2342] shadow-md shadow-[#8B2342]/20"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-[#8B2342] hover:text-[#8B2342]"
                              )}
                              data-testid="button-clinic-aesthetic"
                            >
                              <Sparkles className="w-4 h-4" />
                              ✨ تجميل
                            </button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="bg-rose-50 p-4 rounded-xl flex items-start gap-3 border border-rose-100">
                      <CheckCircle2 className="w-5 h-5 text-rose-700 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-rose-900 text-sm">ملخص الموعد</h4>
                        <p className="text-rose-800 text-sm mt-1">
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

      <AddDailyEntryDialog
        open={showDailyEntry}
        onOpenChange={setShowDailyEntry}
        date={selectedDate && isWorkingDay(selectedDate) ? selectedDate : new Date()}
      />

      <AlertDialog open={deletingAptId !== null} onOpenChange={(o) => !o && setDeletingAptId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-tajawal">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الموعد؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deletingAptId !== null) {
                  deleteAppointment(deletingAptId, { onSuccess: () => setDeletingAptId(null) });
                }
              }}
              disabled={isDeleting}
              data-testid="button-confirm-delete"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
              نعم، احذف
            </AlertDialogAction>
            <AlertDialogCancel data-testid="button-cancel-delete">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingApt} onOpenChange={(o) => !o && setEditingApt(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-tajawal">تعديل الموعد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">اسم المريض</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="اسم المريض"
                className="h-10"
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">رقم الهاتف <span className="text-slate-400 font-normal text-xs">(اختياري)</span></label>
              <div className="flex gap-2">
                <Select value={editPhonePrefix} onValueChange={setEditPhonePrefix}>
                  <SelectTrigger className="w-[110px] h-10 bg-slate-50" data-testid="select-edit-prefix">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="972">+972</SelectItem>
                    <SelectItem value="970">+970</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="5xxxxxxxx"
                  className="h-10 bg-slate-50 flex-1"
                  dir="ltr"
                  data-testid="input-edit-phone"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">نوع العيادة</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEditService("أسنان")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 font-bold text-sm transition-all duration-200",
                    editService === "أسنان"
                      ? "bg-[#8B2342] text-white border-[#8B2342] shadow-md"
                      : "bg-white text-slate-600 border-slate-200 hover:border-[#8B2342] hover:text-[#8B2342]"
                  )}
                >
                  🦷 أسنان
                </button>
                <button
                  type="button"
                  onClick={() => setEditService("تجميل")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 font-bold text-sm transition-all duration-200",
                    editService === "تجميل"
                      ? "bg-[#8B2342] text-white border-[#8B2342] shadow-md"
                      : "bg-white text-slate-600 border-slate-200 hover:border-[#8B2342] hover:text-[#8B2342]"
                  )}
                >
                  ✨ تجميل
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ملاحظات</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="أي ملاحظات إضافية..."
                className="bg-slate-50 resize-none"
                rows={2}
                data-testid="textarea-edit-notes"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 flex-row-reverse sm:flex-row-reverse">
            <Button onClick={submitEdit} disabled={isUpdating || !editName.trim()} data-testid="button-save-edit">
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
              حفظ التغييرات
            </Button>
            <Button variant="outline" onClick={() => setEditingApt(null)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
