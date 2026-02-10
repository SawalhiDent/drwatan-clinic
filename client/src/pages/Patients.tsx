import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema, insertAppointmentSchema, type InsertPatient, type Patient, type InsertAppointment } from "@shared/schema";
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
import { Search, UserPlus, Pencil, Phone, MapPin, AlertCircle, Pill, FileText, Loader2, MessageSquare, Trash2, Calendar, Eye, Download, FileJson, DollarSign, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { sendWhatsAppMessage, WHATSAPP_TEMPLATES } from "@/lib/whatsapp";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export default function Patients() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const { data: patients, isLoading } = usePatients();
  const { mutate: createPatient, isPending: isCreating } = useCreatePatient();
  const { mutate: updatePatient, isPending: isUpdating } = useUpdatePatient();
  const { mutate: createAppointment, isPending: isBooking } = useCreateAppointment();

  const isSaving = isCreating || isUpdating;

  // Initial values for the form
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

  const bookingForm = useForm<InsertAppointment>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      patientName: "",
      phone: "",
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "12:00",
      service: "كشف عام",
      status: "scheduled"
    }
  });

  const handleOpenDialog = (patient?: Patient) => {
    if (patient) {
      setEditingPatient(patient);
      form.reset({
        fullName: patient.fullName,
        phone: patient.phone,
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
      form.reset(defaultValues);
    }
    setIsDialogOpen(true);
  };

  const handleQuickBooking = (patient: Patient) => {
    setSelectedPatient(patient);
    bookingForm.reset({
      patientId: patient.id,
      patientName: patient.fullName,
      phone: patient.phone,
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "12:00",
      service: "كشف عام",
      status: "scheduled"
    });
    setIsQuickBookingOpen(true);
  };

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDetailsOpen(true);
  };

  const onSubmit = (data: InsertPatient) => {
    if (editingPatient) {
      updatePatient({ id: editingPatient.id, ...data }, {
        onSuccess: () => setIsDialogOpen(false)
      });
    } else {
      createPatient(data, {
        onSuccess: () => setIsDialogOpen(false)
      });
    }
  };

  const onBookingSubmit = (data: InsertAppointment) => {
    createAppointment(data, {
      onSuccess: () => setIsQuickBookingOpen(false)
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
            <Button variant="outline" className="bg-white border-slate-200 h-9 px-4 text-slate-700 text-sm">
              <Download className="ml-2 w-4 h-4" />
              تحميل النموذج العبري
            </Button>
            <Button variant="outline" className="bg-white border-slate-200 h-9 px-4 text-slate-700 text-sm">
              <Download className="ml-2 w-4 h-4" />
              تحميل النموذج العربي
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="bg-[#0e8bab] hover:bg-[#0c7a96] h-9 px-6 text-sm">
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
                            <FormControl>
                              <Input placeholder="05xxxxxxxx" {...field} dir="ltr" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="paidAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>المبلغ المدفوع (ريال)</FormLabel>
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
                    <FileText className="w-5 h-5 text-[#0e8bab]" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-base font-bold text-slate-900">{patient.fullName}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span dir="ltr" className="text-sm text-slate-500">{patient.phone}</span>
                      {patient.phone && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => sendWhatsAppMessage(patient.phone, `مرحباً ${patient.fullName}، معك عيادة الأسنان...`)}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    size="sm"
                    className="bg-[#0e8bab] hover:bg-[#0c7a96] h-8 rounded-lg gap-2 text-xs"
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

                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400"
                    onClick={() => handleOpenDialog(patient)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>

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
        <DialogContent className="max-w-md bg-slate-50 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-tajawal">حجز سريع: {selectedPatient?.fullName}</DialogTitle>
          </DialogHeader>
          <Form {...bookingForm}>
            <form onSubmit={bookingForm.handleSubmit(onBookingSubmit)} className="space-y-4 pt-4">
              <FormField
                control={bookingForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ الموعد</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={bookingForm.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوقت</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsQuickBookingOpen(false)}>إلغاء</Button>
                <Button type="submit" className="bg-[#0e8bab]" disabled={isBooking}>تأكيد الحجز</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 border-slate-200 bg-white">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-bold font-tajawal flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0e8bab]" />
              ملف المريض: {selectedPatient?.fullName}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="info" className="flex-1 flex flex-col">
            <div className="px-6 border-b">
              <TabsList className="bg-transparent gap-6 h-12 p-0 w-full justify-start">
                <TabsTrigger value="info" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0e8bab] rounded-none h-full bg-transparent shadow-none px-2 text-slate-500 data-[state=active]:text-[#0e8bab]">التفاصيل</TabsTrigger>
                <TabsTrigger value="files" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0e8bab] rounded-none h-full bg-transparent shadow-none px-2 text-slate-500 data-[state=active]:text-[#0e8bab]">الملفات والصور</TabsTrigger>
                <TabsTrigger value="payments" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0e8bab] rounded-none h-full bg-transparent shadow-none px-2 text-slate-500 data-[state=active]:text-[#0e8bab]">الدفعات</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              <TabsContent value="info" className="mt-0 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-1">رقم الهاتف</span>
                    <span dir="ltr" className="font-bold text-slate-700">{selectedPatient?.phone}</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-1">العنوان</span>
                    <span className="font-bold text-slate-700">{selectedPatient?.address || "غير محدد"}</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-100">
                  <h4 className="font-bold text-[#0e8bab] mb-3 flex items-center gap-2">
                    <ActivityIcon className="w-4 h-4" />
                    السجل الطبي
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500">الحساسية</span>
                      <span className="font-medium text-red-600">{selectedPatient?.allergies || "لا يوجد"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500">الأمراض المزمنة</span>
                      <span className="font-medium text-orange-600">{selectedPatient?.chronicDiseases || "لا يوجد"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">الأدوية الحالية</span>
                      <span className="font-medium text-blue-600">{selectedPatient?.currentMeds || "لا يوجد"}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-100">
                  <h4 className="font-bold text-slate-700 mb-2">ملاحظات</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {selectedPatient?.notes || "لا توجد ملاحظات إضافية."}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="files" className="mt-0">
                <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
                  <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                  </div>
                  <h4 className="text-slate-600 font-bold mb-1">لا توجد ملفات مرفقة</h4>
                  <p className="text-slate-400 text-sm mb-4">يمكنك رفع صور الأشعة أو التقارير الطبية هنا</p>
                  <Button variant="outline" className="border-[#0e8bab] text-[#0e8bab] hover:bg-blue-50">
                    <Download className="ml-2 w-4 h-4 rotate-180" />
                    رفع ملف جديد
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="payments" className="mt-0 space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-sm text-slate-400 block">إجمالي المدفوعات</span>
                    <span className="text-2xl font-bold text-green-600">{selectedPatient?.paidAmount || 0} ريال</span>
                  </div>
                  <div className="bg-green-50 p-3 rounded-full">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-700 mb-4">آخر العمليات</h4>
                  <div className="text-center py-6 text-slate-400 text-sm">
                    لا توجد عمليات دفع مسجلة حالياً
                  </div>
                </div>

                <Button className="w-full bg-[#0e8bab] h-11">
                  إضافة دفعة جديدة
                </Button>
              </TabsContent>
            </div>
          </Tabs>
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
