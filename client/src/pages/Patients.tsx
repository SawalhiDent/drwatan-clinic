import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema, type InsertPatient, type Patient, type TreatmentNote } from "@shared/schema";
import { usePatients, useCreatePatient, useUpdatePatient } from "@/hooks/use-patients";
import { useCreateAppointment } from "@/hooks/use-appointments";
import { Layout } from "@/components/Layout";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, Pencil, FileText, Loader2, Trash2, Calendar, Eye, Download, FileJson, DollarSign, Image as ImageIcon, ClipboardList, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WhatsAppTemplatePicker } from "@/components/WhatsAppTemplatePicker";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, addMinutes, setHours, setMinutes } from "date-fns";
import { arSA } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useAppointments } from "@/hooks/use-appointments";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2 } from "lucide-react";

const ALLOWED_DAYS = [0, 1, 2, 3, 4, 5, 6];
const START_HOUR = 10;
const END_HOUR = 21;
const SLOT_DURATION = 30;

export default function Patients() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsLang, setDetailsLang] = useState<"ar" | "he">("ar");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "check">("cash");
  const [paymentCurrency, setPaymentCurrency] = useState("₪");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [checkImage, setCheckImage] = useState<string | null>(null);
  const [quickBookDate, setQuickBookDate] = useState<Date | undefined>(new Date());
  const [quickBookTime, setQuickBookTime] = useState<string | null>(null);
  const [quickBookClinic, setQuickBookClinic] = useState<"أسنان" | "تجميل">("أسنان");
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [phonePrefix, setPhonePrefix] = useState("972");

  const { data: patients, isLoading } = usePatients();
  const { mutate: createPatient, isPending: isCreating } = useCreatePatient();
  const { mutate: updatePatient, isPending: isUpdating } = useUpdatePatient();

  const { data: treatmentNotesData, isLoading: isLoadingNotes } = useQuery<TreatmentNote[]>({
    queryKey: [`/api/patients/${selectedPatient?.id}/treatment-notes`],
    enabled: !!selectedPatient?.id && isDetailsOpen,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCheckImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPayment = () => {
    if (!selectedPatient) return;
    
    const newPayment = {
      amount: paymentAmount,
      date: new Date().toISOString(),
      method: paymentMethod,
      currency: paymentCurrency,
      checkImageUrl: paymentMethod === "check" ? checkImage || "https://img.freepik.com/free-vector/blank-bank-check-template-layout_1017-23425.jpg" : undefined
    };

    const currentPayments = (selectedPatient.payments as any[]) || [];
    const updatedPayments = [newPayment, ...currentPayments];
    const updatedTotal = (selectedPatient.paidAmount || 0) + paymentAmount;

    updatePatient({
      id: selectedPatient.id,
      payments: updatedPayments,
      paidAmount: updatedTotal,
      currencySymbol: paymentCurrency
    }, {
      onSuccess: (updatedPatient) => {
        setIsPaymentDialogOpen(false);
        setPaymentAmount(0);
        setCheckImage(null);
        setSelectedPatient(updatedPatient);
      }
    });
  };

  const handleUploadFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPatient || !e.target.files?.length) return;
    setIsUploadingFiles(true);
    const files = Array.from(e.target.files);
    const readers: Promise<{ id: string; name: string; data: string; date: string }>[] = files.map(file =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
            name: file.name,
            data: reader.result as string,
            date: new Date().toISOString(),
          });
        };
        reader.readAsDataURL(file);
      })
    );

    Promise.all(readers).then((newFiles) => {
      const currentFiles = (selectedPatient.files as any[]) || [];
      const updatedFiles = [...newFiles, ...currentFiles];
      updatePatient({ id: selectedPatient.id, files: updatedFiles }, {
        onSuccess: (updated) => {
          setSelectedPatient(updated);
          setIsUploadingFiles(false);
        },
        onError: () => setIsUploadingFiles(false)
      });
    });
  };

  const handleDeleteFile = (fileId: string) => {
    if (!selectedPatient) return;
    const currentFiles = (selectedPatient.files as any[]) || [];
    const updatedFiles = currentFiles.filter((f: any) => f.id !== fileId);
    updatePatient({ id: selectedPatient.id, files: updatedFiles }, {
      onSuccess: (updated) => setSelectedPatient(updated)
    });
  };

  const { mutate: createAppointment, isPending: isBooking } = useCreateAppointment();

  const quickBookFormattedDate = quickBookDate ? format(quickBookDate, "yyyy-MM-dd") : undefined;
  const { data: quickBookAppointments, isLoading: isLoadingSlots } = useAppointments(quickBookFormattedDate);

  const generateTimeSlots = () => {
    const slots = [];
    let currentTime = setMinutes(setHours(new Date(), START_HOUR), 0);
    const endTime = setMinutes(setHours(new Date(), END_HOUR), 0);
    while (currentTime < endTime) {
      const timeString = format(currentTime, "HH:mm");
      // A slot is taken only if the SAME clinic type already has an appointment at that time
      const isTaken = quickBookAppointments?.some(apt =>
        apt.startTime === timeString &&
        apt.status !== 'cancelled' &&
        apt.service === quickBookClinic
      );
      slots.push({ time: timeString, available: !isTaken });
      currentTime = addMinutes(currentTime, SLOT_DURATION);
    }
    return slots;
  };

  const quickBookSlots = quickBookDate ? generateTimeSlots() : [];

  const isSaving = isCreating || isUpdating;

  const defaultValues: Partial<InsertPatient> = {
    fullName: "",
    phone: "",
    age: undefined,
    gender: "male",
    address: "",
    allergies: "",
    chronicDiseases: "",
    currentMeds: "",
    notes: "",
    paidAmount: 0,
  };

  const form = useForm<InsertPatient>({
    resolver: zodResolver(insertPatientSchema),
    defaultValues
  });

  const handleOpenDialog = (patient?: Patient) => {
    if (patient) {
      setEditingPatient(patient);
      const phone = (patient.phone || "").replace(/\D/g, "");
      let detectedPrefix = "972";
      let localNumber = phone;
      if (phone.startsWith("970")) {
        detectedPrefix = "970";
        localNumber = phone.substring(3);
      } else if (phone.startsWith("972")) {
        detectedPrefix = "972";
        localNumber = phone.substring(3);
      } else if (phone.startsWith("0")) {
        localNumber = phone.substring(1);
      }
      setPhonePrefix(detectedPrefix);
      form.reset({
        fullName: patient.fullName,
        phone: localNumber,
        age: patient.age,
        gender: patient.gender,
        address: patient.address || "",
        allergies: patient.allergies || "",
        chronicDiseases: patient.chronicDiseases || "",
        currentMeds: patient.currentMeds || "",
        notes: patient.notes || "",
        paidAmount: patient.paidAmount || 0,
      });
    } else {
      setEditingPatient(null);
      setPhonePrefix("972");
      form.reset(defaultValues);
    }
    setIsDialogOpen(true);
  };

  const handleQuickBooking = (patient: Patient) => {
    setSelectedPatient(patient);
    setQuickBookDate(new Date());
    setQuickBookTime(null);
    setQuickBookClinic("أسنان");
    setIsQuickBookingOpen(true);
  };

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDetailsOpen(true);
  };

  const onSubmit = (data: InsertPatient) => {
    let phone = (data.phone || "").replace(/\D/g, "");
    if (phone.startsWith("0")) {
      phone = phone.substring(1);
    }
    if (phone.startsWith("972") || phone.startsWith("970")) {
      phone = phonePrefix + phone.substring(3);
    } else {
      phone = phonePrefix + phone;
    }
    const submitData = { ...data, phone };

    if (editingPatient) {
      updatePatient({ id: editingPatient.id, ...submitData }, {
        onSuccess: () => setIsDialogOpen(false)
      });
    } else {
      createPatient(submitData, {
        onSuccess: () => setIsDialogOpen(false)
      });
    }
  };

  const onQuickBookingConfirm = () => {
    if (!selectedPatient || !quickBookDate || !quickBookTime) return;
    const [h, m] = quickBookTime.split(":").map(Number);
    const startDate = new Date(quickBookDate);
    startDate.setHours(h, m, 0, 0);
    const endDate = addMinutes(startDate, SLOT_DURATION);

    createAppointment({
      patientId: selectedPatient.id,
      patientName: selectedPatient.fullName,
      phone: selectedPatient.phone || "000",
      date: format(quickBookDate, "yyyy-MM-dd"),
      startTime: quickBookTime,
      endTime: format(endDate, "HH:mm"),
      service: quickBookClinic,
      status: "scheduled"
    }, {
      onSuccess: () => {
        setIsQuickBookingOpen(false);
        setQuickBookTime(null);
      }
    });
  };

  // Filter patients
  const filteredPatients = patients?.filter(p => 
    p.fullName.toLowerCase().includes(search.toLowerCase()) || 
    p.phone.includes(search)
  ) || [];

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-tajawal text-slate-900">ملفات المرضى</h1>
            <p className="text-slate-500 mt-1 text-sm">إدارة بيانات المرضى والسجلات الطبية</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="bg-[#8B2342] hover:bg-[#6d1b33] h-9 px-6 text-sm">
                  <UserPlus className="ml-2 w-4 h-4" />
                  إضافة مريض جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-50 border-slate-200">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold font-tajawal">
                    {editingPatient ? "تعديل بيانات المريض" : "إضافة ملف مريض جديد"}
                  </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الاسم الكامل</FormLabel>
                            <FormControl>
                              <Input placeholder="الاسم الرباعي" {...field} />
                            </FormControl>
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
                              <Select value={phonePrefix} onValueChange={setPhonePrefix}>
                                <SelectTrigger className="w-[110px]" data-testid="select-phone-prefix">
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
                                  dir="ltr"
                                  className="flex-1"
                                  data-testid="input-phone"
                                  onChange={(e) => {
                                    let val = e.target.value.replace(/[^\d]/g, "");
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
                        name="paidAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>المبلغ المدفوع</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>العنوان</FormLabel>
                          <FormControl>
                            <Input placeholder="المدينة، الحي" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="border-t border-slate-100 my-4 pt-4">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <ActivityIcon />
                        السجل الطبي
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="allergies"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>حساسية</FormLabel>
                              <FormControl>
                                <Input placeholder="هل يعاني من حساسية لأدوية معينة؟" {...field} value={field.value || ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="chronicDiseases"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>أمراض مزمنة</FormLabel>
                              <FormControl>
                                <Input placeholder="سكري، ضغط، قلب..." {...field} value={field.value || ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ملاحظات إضافية</FormLabel>
                          <FormControl>
                            <Textarea placeholder="ملاحظات عامة..." {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter className="pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                      <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        {editingPatient ? "حفظ التعديلات" : "إضافة الملف"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="relative w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              placeholder="ابحث عن مريض بالاسم أو رقم الهاتف..." 
              className="pr-12 h-10 bg-white border-slate-200 rounded-lg" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Patient Cards */}
        <div className="flex flex-col gap-2">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center p-10 bg-white rounded-xl border border-slate-100 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>لا يوجد مرضى مطابقين للبحث</p>
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <div key={patient.id} className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <FileText className="w-5 h-5 text-[#8B2342]" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-base font-bold text-slate-900">{patient.fullName}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span dir="ltr" className="text-sm text-slate-500">{patient.phone}</span>
                      {patient.phone && (
                        <WhatsAppTemplatePicker
                          phone={patient.phone}
                          context={{
                            name: patient.fullName,
                            totalPaid: patient.paidAmount ?? 0,
                            currency: patient.currencySymbol ?? "₪",
                            payments: (patient.payments ?? []).map(p => ({
                              amount: p.amount,
                              date: p.date,
                              method: p.method,
                              currency: p.currency,
                            })),
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    size="sm"
                    className="bg-[#8B2342] hover:bg-[#6d1b33] h-8 rounded-lg gap-2 text-xs"
                    onClick={() => handleQuickBooking(patient)}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    حجز موعد
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 border-slate-200 text-slate-700 gap-2 text-xs"
                    onClick={() => handleViewDetails(patient)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    عرض التفاصيل
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border-slate-200 shadow-xl">
                      <DropdownMenuItem 
                        className="text-right justify-end cursor-pointer hover:bg-slate-50"
                        onClick={() => handleOpenDialog(patient)}
                      >
                        تعديل البيانات
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Booking Dialog */}
      <Dialog open={isQuickBookingOpen} onOpenChange={setIsQuickBookingOpen}>
        <DialogContent className="max-w-lg bg-slate-50 border-slate-200 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-tajawal">حجز سريع: {selectedPatient?.fullName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 p-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#8B2342]" />
                <span className="font-bold text-sm">اختيار التاريخ</span>
              </div>
              <CalendarComponent
                mode="single"
                selected={quickBookDate}
                onSelect={(date) => { setQuickBookDate(date); setQuickBookTime(null); }}
                disabled={(date) => !ALLOWED_DAYS.includes(date.getDay()) || date < new Date(new Date().setHours(0,0,0,0))}
                className="rounded-md w-full flex justify-center p-3"
                dir="ltr"
                locale={arSA}
              />
            </div>

            {quickBookDate && (
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#8B2342]" />
                    <span className="font-bold text-sm">الأوقات المتاحة</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {format(quickBookDate, "EEEE, d MMMM yyyy", { locale: arSA })}
                  </p>
                </div>
                <div className="p-3">
                  {isLoadingSlots ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-[#8B2342]" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {quickBookSlots.map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          data-testid={`quick-slot-${slot.time}`}
                          onClick={() => setQuickBookTime(slot.time)}
                          className={cn(
                            "px-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
                            quickBookTime === slot.time
                              ? "bg-[#8B2342] text-white border-[#8B2342] shadow-md"
                              : slot.available
                              ? "bg-white text-slate-700 border-slate-200 hover:border-[#8B2342] hover:text-[#8B2342]"
                              : "bg-slate-100 text-slate-400 border-transparent cursor-not-allowed line-through"
                          )}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Clinic Type Selector */}
            <div className="bg-white rounded-xl border border-slate-100 p-3">
              <p className="text-sm font-bold mb-2 text-slate-700">نوع العيادة</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setQuickBookClinic("أسنان")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-bold text-sm transition-all duration-200",
                    quickBookClinic === "أسنان"
                      ? "bg-[#8B2342] text-white border-[#8B2342] shadow-md"
                      : "bg-white text-slate-600 border-slate-200 hover:border-[#8B2342] hover:text-[#8B2342]"
                  )}
                >
                  🦷 أسنان
                </button>
                <button
                  type="button"
                  onClick={() => setQuickBookClinic("تجميل")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-bold text-sm transition-all duration-200",
                    quickBookClinic === "تجميل"
                      ? "bg-[#8B2342] text-white border-[#8B2342] shadow-md"
                      : "bg-white text-slate-600 border-slate-200 hover:border-[#8B2342] hover:text-[#8B2342]"
                  )}
                >
                  ✨ تجميل
                </button>
              </div>
            </div>

            {quickBookTime && quickBookDate && (
              <div className="bg-rose-50 p-3 rounded-xl flex items-start gap-3 border border-rose-100">
                <CheckCircle2 className="w-5 h-5 text-rose-700 mt-0.5" />
                <div>
                  <h4 className="font-bold text-rose-900 text-sm">ملخص الموعد</h4>
                  <p className="text-rose-800 text-sm mt-1">
                    التاريخ: {format(quickBookDate, "yyyy-MM-dd")} — الوقت: {quickBookTime} — {quickBookClinic}
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsQuickBookingOpen(false)}>إلغاء</Button>
              <Button
                type="button"
                className="bg-[#8B2342]"
                disabled={isBooking || !quickBookTime || !quickBookDate}
                onClick={onQuickBookingConfirm}
                data-testid="button-confirm-quick-booking"
              >
                {isBooking ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                تأكيد الحجز
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] w-[95vw] md:w-auto overflow-hidden flex flex-col p-0 border-slate-200 bg-white">
          <DialogHeader className="p-4 md:p-6 pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <DialogTitle className="text-base md:text-xl font-bold font-tajawal flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#8B2342] shrink-0" />
                <span className="truncate">{detailsLang === "he" ? `תיק מטופל: ${selectedPatient?.fullName}` : `ملف المريض: ${selectedPatient?.fullName}`}</span>
              </DialogTitle>
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 shrink-0">
                <button
                  onClick={() => setDetailsLang("ar")}
                  className={cn("px-3 py-1 rounded-md text-sm font-medium transition-colors", detailsLang === "ar" ? "bg-[#8B2342] text-white" : "text-slate-500")}
                  data-testid="button-lang-ar"
                >
                  عربي
                </button>
                <button
                  onClick={() => setDetailsLang("he")}
                  className={cn("px-3 py-1 rounded-md text-sm font-medium transition-colors", detailsLang === "he" ? "bg-[#8B2342] text-white" : "text-slate-500")}
                  data-testid="button-lang-he"
                >
                  עברית
                </button>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="info" className="flex-1 flex flex-col">
            <div className="px-4 md:px-6 border-b overflow-x-auto" dir={detailsLang === "he" ? "ltr" : "rtl"}>
              <TabsList className="bg-transparent gap-2 md:gap-6 h-12 p-0 w-max md:w-full justify-start">
                <TabsTrigger value="info" className="data-[state=active]:border-b-2 data-[state=active]:border-[#8B2342] rounded-none h-full bg-transparent shadow-none px-2 text-xs md:text-sm text-slate-500 data-[state=active]:text-[#8B2342] whitespace-nowrap">{detailsLang === "he" ? "פרטים" : "التفاصيل"}</TabsTrigger>
                <TabsTrigger value="files" className="data-[state=active]:border-b-2 data-[state=active]:border-[#8B2342] rounded-none h-full bg-transparent shadow-none px-2 text-xs md:text-sm text-slate-500 data-[state=active]:text-[#8B2342] whitespace-nowrap">{detailsLang === "he" ? "קבצים" : "الملفات"}</TabsTrigger>
                <TabsTrigger value="payments" className="data-[state=active]:border-b-2 data-[state=active]:border-[#8B2342] rounded-none h-full bg-transparent shadow-none px-2 text-xs md:text-sm text-slate-500 data-[state=active]:text-[#8B2342] whitespace-nowrap">{detailsLang === "he" ? "תשלומים" : "الدفعات"}</TabsTrigger>
                <TabsTrigger value="treatment-history" className="data-[state=active]:border-b-2 data-[state=active]:border-[#8B2342] rounded-none h-full bg-transparent shadow-none px-2 text-xs md:text-sm text-slate-500 data-[state=active]:text-[#8B2342] whitespace-nowrap">{detailsLang === "he" ? "היסטוריית טיפולים" : "سجل العلاج"}</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/30">
              <TabsContent value="info" className="mt-0 space-y-6" dir={detailsLang === "he" ? "ltr" : "rtl"}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-1">{detailsLang === "he" ? "טלפון" : "رقم الهاتف"}</span>
                    <span dir="ltr" className="font-bold text-slate-700">{selectedPatient?.phone}</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-1">{detailsLang === "he" ? "כתובת" : "العنوان"}</span>
                    <span className="font-bold text-slate-700">{selectedPatient?.address || (detailsLang === "he" ? "לא צוין" : "غير محدد")}</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-100">
                  <h4 className="font-bold text-[#8B2342] mb-3 flex items-center gap-2">
                    <ActivityIcon className="w-4 h-4" />
                    {detailsLang === "he" ? "היסטוריה רפואית" : "السجل الطبي"}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500">{detailsLang === "he" ? "אלרגיות" : "الحساسية"}</span>
                      <span className="font-medium text-red-600">{selectedPatient?.allergies || (detailsLang === "he" ? "אין" : "لا يوجد")}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500">{detailsLang === "he" ? "מחלות כרוניות" : "الأمراض المزمنة"}</span>
                      <span className="font-medium text-orange-600">{selectedPatient?.chronicDiseases || (detailsLang === "he" ? "אין" : "لا يوجد")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{detailsLang === "he" ? "תרופות נוכחיות" : "الأدوية الحالية"}</span>
                      <span className="font-medium text-rose-700">{selectedPatient?.currentMeds || (detailsLang === "he" ? "אין" : "لا يوجد")}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-100">
                  <h4 className="font-bold text-slate-700 mb-2">{detailsLang === "he" ? "הערות" : "ملاحظات"}</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {selectedPatient?.notes || (detailsLang === "he" ? "אין הערות נוספות." : "لا توجد ملاحظات إضافية.")}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="files" className="mt-0 space-y-4" dir={detailsLang === "he" ? "ltr" : "rtl"}>
                <div className="bg-white rounded-xl border border-dashed border-slate-200 p-6 text-center relative">
                  <input
                    type="file"
                    id="patient-files-upload"
                    data-testid="input-patient-files"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    multiple
                    accept="image/*"
                    onChange={(e) => { handleUploadFiles(e); e.target.value = ""; }}
                  />
                  <div className="pointer-events-none">
                    <div className="bg-slate-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                      {isUploadingFiles ? (
                        <Loader2 className="w-6 h-6 animate-spin text-[#8B2342]" />
                      ) : (
                        <Download className="w-6 h-6 text-slate-400 rotate-180" />
                      )}
                    </div>
                    <h4 className="text-slate-600 font-bold text-sm mb-1">
                      {isUploadingFiles ? (detailsLang === "he" ? "...מעלה" : "جاري الرفع...") : (detailsLang === "he" ? "לחץ להעלאת תמונות חדשות" : "اضغط لرفع صور جديدة")}
                    </h4>
                    <p className="text-slate-400 text-xs">{detailsLang === "he" ? "ניתן לבחור מספר תמונות בו-זמנית" : "يمكنك اختيار أكثر من صورة في نفس الوقت"}</p>
                  </div>
                </div>

                {(() => {
                  const patientFiles = (selectedPatient?.files as any[]) || [];
                  if (patientFiles.length === 0) return (
                    <div className="text-center py-6 text-slate-400 text-sm">{detailsLang === "he" ? "אין תמונות מצורפות עדיין" : "لا توجد صور مرفقة بعد"}</div>
                  );
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {patientFiles.map((file: any) => (
                        <div key={file.id} className="group relative bg-white rounded-xl border border-slate-100 overflow-hidden">
                          <img
                            src={file.data}
                            alt={file.name}
                            className="w-full h-32 object-cover cursor-pointer"
                            data-testid={`file-image-${file.id}`}
                            onClick={() => setViewingImage(file.data)}
                          />
                          <div className="p-2 flex items-center justify-between gap-1">
                            <span className="text-xs text-slate-500 truncate flex-1">{file.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`delete-file-${file.id}`}
                              onClick={() => handleDeleteFile(file.id)}
                              className="text-red-500 h-7 w-7"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="payments" className="mt-0 space-y-4" dir={detailsLang === "he" ? "ltr" : "rtl"}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-sm text-slate-400 block">{detailsLang === "he" ? "סה\"כ מזומן" : "إجمالي الكاش"}</span>
                      <div className="space-y-1">
                        {Object.entries(
                          ((selectedPatient?.payments as any[]) || [])
                            .filter(p => p.method === 'cash')
                            .reduce((acc, p) => {
                              acc[p.currency] = (acc[p.currency] || 0) + p.amount;
                              return acc;
                            }, {} as Record<string, number>)
                        ).map(([curr, total]) => (
                          <span key={curr} className="text-2xl font-bold text-green-600 block leading-none">
                            {total as number} {curr}
                          </span>
                        ))}
                        {Object.keys(
                          ((selectedPatient?.payments as any[]) || [])
                            .filter(p => p.method === 'cash')
                            .reduce((acc, p) => {
                              acc[p.currency] = (acc[p.currency] || 0) + p.amount;
                              return acc;
                            }, {} as Record<string, number>)
                        ).length === 0 && (
                          <span className="text-2xl font-bold text-slate-300 block">0</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-full">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-sm text-slate-400 block">{detailsLang === "he" ? "סה\"כ צ'קים" : "إجمالي الشيكات"}</span>
                      <div className="space-y-1">
                        {Object.entries(
                          ((selectedPatient?.payments as any[]) || [])
                            .filter(p => p.method === 'check')
                            .reduce((acc, p) => {
                              acc[p.currency] = (acc[p.currency] || 0) + p.amount;
                              return acc;
                            }, {} as Record<string, number>)
                        ).map(([curr, total]) => (
                          <span key={curr} className="text-2xl font-bold text-rose-700 block leading-none">
                            {total as number} {curr}
                          </span>
                        ))}
                        {Object.keys(
                          ((selectedPatient?.payments as any[]) || [])
                            .filter(p => p.method === 'check')
                            .reduce((acc, p) => {
                              acc[p.currency] = (acc[p.currency] || 0) + p.amount;
                              return acc;
                            }, {} as Record<string, number>)
                        ).length === 0 && (
                          <span className="text-2xl font-bold text-slate-300 block">0</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-rose-50 p-3 rounded-full">
                      <FileJson className="w-6 h-6 text-rose-700" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-700 mb-4">{detailsLang === "he" ? "פעולות אחרונות" : "آخر العمليات"}</h4>
                  <div className="space-y-3">
                    {((selectedPatient?.payments as any[]) || []).length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-sm">
                        {detailsLang === "he" ? "אין פעולות תשלום רשומות כרגע" : "لا توجد عمليات دفع مسجلة حالياً"}
                      </div>
                    ) : (
                      ((selectedPatient?.payments as any[]) || []).map((payment, i) => (
                        <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0">
                          <div>
                            <span className="block font-bold text-slate-700">{payment.amount} {payment.currency}</span>
                            <span className="text-[10px] text-slate-400">{format(new Date(payment.date), "yyyy-MM-dd")}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={payment.method === 'cash' ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-800'}>
                              {payment.method === 'cash' ? (detailsLang === "he" ? "מזומן" : "كاش") : (detailsLang === "he" ? "צ'ק" : "شيك")}
                            </Badge>
                            {payment.method === 'check' && payment.checkImageUrl && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 px-2 text-[10px]"
                                onClick={() => window.open(payment.checkImageUrl, '_blank')}
                              >
                                <ImageIcon className="w-3 h-3 ml-1" />
                                {detailsLang === "he" ? "הצג צ'ק" : "عرض الشيك"}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-[#8B2342] h-11">
                      {detailsLang === "he" ? "הוספת תשלום חדש" : "إضافة دفعة جديدة"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-slate-50 border-slate-200" dir={detailsLang === "he" ? "ltr" : "rtl"}>
                    <DialogHeader>
                      <DialogTitle className="font-bold">{detailsLang === "he" ? "הוספת תשלום חדש" : "إضافة دفعة جديدة"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{detailsLang === "he" ? "סכום" : "المبلغ"}</label>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{detailsLang === "he" ? "מטבע" : "رمز العملة"}</label>
                          <Input 
                            placeholder="₪, $, ريال..." 
                            value={paymentCurrency}
                            onChange={(e) => setPaymentCurrency(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{detailsLang === "he" ? "אמצעי תשלום" : "طريقة الدفع"}</label>
                        <Select onValueChange={(val: any) => setPaymentMethod(val)} defaultValue="cash">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200">
                            <SelectItem value="cash">{detailsLang === "he" ? "מזומן" : "كاش"}</SelectItem>
                            <SelectItem value="check">{detailsLang === "he" ? "צ'ק" : "شيك"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {paymentMethod === "check" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{detailsLang === "he" ? "תמונת צ'ק" : "صورة الشيك"}</label>
                          <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center bg-white relative">
                            {checkImage ? (
                              <div className="relative group">
                                <img src={checkImage} alt="Check" className="max-h-32 mx-auto rounded-md shadow-sm" />
                                <Button 
                                  variant="destructive" 
                                  size="icon" 
                                  className="h-6 w-6 absolute -top-2 -right-2 rounded-full"
                                  onClick={() => setCheckImage(null)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <span className="text-xs text-slate-500 block mb-2">{detailsLang === "he" ? "לחץ להעלאת תמונת צ'ק" : "اضغط لرفع صورة الشيك"}</span>
                                <Input 
                                  type="file" 
                                  accept="image/*" 
                                  className="absolute inset-0 opacity-0 cursor-pointer" 
                                  onChange={handleFileChange}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      <DialogFooter className="pt-4">
                        <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>{detailsLang === "he" ? "ביטול" : "إلغاء"}</Button>
                        <Button className="bg-[#8B2342]" onClick={handleAddPayment} disabled={isUpdating}>
                          {isUpdating && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                          {detailsLang === "he" ? "אישור תשלום" : "تأكيد الدفعة"}
                        </Button>
                      </DialogFooter>
                    </div>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              <TabsContent value="treatment-history" className="mt-0 space-y-4" dir={detailsLang === "he" ? "ltr" : "rtl"}>
                <div className="bg-white p-4 rounded-xl border border-slate-100">
                  <h4 className="font-bold text-[#8B2342] mb-4 flex items-center gap-2" data-testid="text-treatment-history-title">
                    <Stethoscope className="w-4 h-4" />
                    {detailsLang === "he" ? "מעקב טיפולים" : "سجل متابعة العلاج"}
                  </h4>
                  {isLoadingNotes ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[#8B2342]" />
                    </div>
                  ) : !treatmentNotesData || treatmentNotesData.length === 0 ? (
                    <div className="text-center py-8 text-slate-400" data-testid="text-no-treatment-notes">
                      <ClipboardList className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm">{detailsLang === "he" ? "אין הערות טיפול רשומות עדיין" : "لا توجد ملاحظات علاج مسجلة بعد"}</p>
                      <p className="text-xs mt-1">{detailsLang === "he" ? "ההערות יופיעו כאן כשיתווספו מהיומן היומי" : "ستظهر هنا الملاحظات عند إضافتها من السجل اليومي"}</p>
                    </div>
                  ) : (
                    <div className="space-y-3" data-testid="treatment-notes-list">
                      {treatmentNotesData.map((note) => (
                        <div
                          key={note.id}
                          className="border border-slate-100 rounded-lg p-3 bg-slate-50/50"
                          data-testid={`treatment-note-${note.id}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-[#8B2342]" />
                              <span className="text-sm font-bold text-slate-700" data-testid={`treatment-note-date-${note.id}`}>
                                {note.date}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {note.treatment && (
                                <Badge variant="outline" className="bg-rose-50 text-rose-800 text-xs" data-testid={`treatment-note-service-${note.id}`}>
                                  {note.treatment}
                                </Badge>
                              )}
                              {note.doctor && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 text-xs" data-testid={`treatment-note-doctor-${note.id}`}>
                                  {note.doctor}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed" data-testid={`treatment-note-text-${note.id}`}>
                            {note.notes}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/95 border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>عرض الصورة</DialogTitle>
          </DialogHeader>
          {viewingImage && (
            <img
              src={viewingImage}
              alt="صورة مكبرة"
              className="w-full max-h-[80vh] object-contain rounded-md"
              data-testid="lightbox-image"
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={props.className || "w-4 h-4 text-orange-500"}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}
