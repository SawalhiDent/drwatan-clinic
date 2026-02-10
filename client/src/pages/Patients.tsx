import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema, type InsertPatient, type Patient } from "@shared/schema";
import { usePatients, useCreatePatient, useUpdatePatient } from "@/hooks/use-patients";
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
import { Search, UserPlus, Pencil, Phone, MapPin, AlertCircle, Pill, FileText, Loader2, MessageSquare, Trash2, Calendar, Eye, Download, FileJson } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { sendWhatsAppMessage, WHATSAPP_TEMPLATES } from "@/lib/whatsapp";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";

export default function Patients() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [, setLocation] = useLocation();

  const { data: patients, isLoading } = usePatients();
  const { mutate: createPatient, isPending: isCreating } = useCreatePatient();
  const { mutate: updatePatient, isPending: isUpdating } = useUpdatePatient();

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

  // Filter patients
  const filteredPatients = patients?.filter(p => 
    p.fullName.toLowerCase().includes(search.toLowerCase()) || 
    p.phone.includes(search)
  ) || [];

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header Section from Image */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold font-tajawal text-slate-900">ملفات المرضى</h1>
            <p className="text-slate-500 mt-1">إدارة بيانات المرضى والسجلات الطبية</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="bg-white border-slate-200 h-10 px-4 text-slate-700">
              <Download className="ml-2 w-4 h-4" />
              تحميل النموذج العبري
            </Button>
            <Button variant="outline" className="bg-white border-slate-200 h-10 px-4 text-slate-700">
              <Download className="ml-2 w-4 h-4" />
              تحميل النموذج العربي
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="bg-[#0e8bab] hover:bg-[#0c7a96] h-10 px-6">
                  <UserPlus className="ml-2 w-5 h-5" />
                  إضافة مريض جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-50 dark:bg-slate-900 border-slate-200">
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
                        name="age"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>العمر</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الجنس</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || "male"}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">ذكر</SelectItem>
                                <SelectItem value="female">أنثى</SelectItem>
                              </SelectContent>
                            </Select>
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
                      <div className="mt-4">
                        <FormField
                          control={form.control}
                          name="currentMeds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>أدوية حالية</FormLabel>
                              <FormControl>
                                <Input placeholder="قائمة الأدوية المستخدمة حالياً" {...field} value={field.value || ''} />
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

        {/* Search Bar Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="relative w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              placeholder="ابحث عن مريض بالاسم أو رقم الهاتف..." 
              className="pr-12 h-12 bg-white border-slate-200 rounded-xl" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Patient List (Cards Layout) */}
        <div className="flex flex-col gap-4">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center p-20 bg-white rounded-2xl border border-slate-100 text-slate-400">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">لا يوجد مرضى مطابقين للبحث</p>
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <div key={patient.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-6">
                {/* Patient Info Header */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#0e8bab]" />
                        <h3 className="text-xl font-bold text-slate-900">{patient.fullName}</h3>
                      </div>
                      <span dir="ltr" className="text-slate-500 mt-1">{patient.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Details Section */}
                <div className="flex flex-col gap-2 items-end text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{patient.age} سنة</span>
                    <span className="text-slate-400">:العمر</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{patient.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                    <span className="text-slate-400">:الجنس</span>
                  </div>
                </div>

                {/* Medical Alerts (Added for completeness) */}
                <div className="flex gap-2 flex-wrap justify-end">
                  {patient.allergies && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> حساسية
                    </Badge>
                  )}
                  {patient.chronicDiseases && (
                    <Badge variant="outline" className="flex items-center gap-1 border-orange-200 bg-orange-50 text-orange-700">
                      <ActivityIcon className="w-3 h-3" /> مزمن
                    </Badge>
                  )}
                </div>

                {/* Actions Section */}
                <div className="flex flex-wrap items-center gap-3">
                  <Button 
                    className="flex-1 bg-[#0e8bab] hover:bg-[#0c7a96] h-11 rounded-lg gap-2"
                    onClick={() => setLocation(`/booking?patient=${patient.id}`)}
                  >
                    <Calendar className="w-4 h-4" />
                    حجز موعد
                  </Button>
                  
                  <Button variant="outline" className="flex-1 h-11 border-slate-200 text-slate-700 gap-2">
                    <Eye className="w-4 h-4" />
                    عرض التفاصيل
                  </Button>

                  <Button 
                    variant="outline" 
                    className="flex-1 h-11 border-slate-200 text-slate-700 gap-2"
                    onClick={() => handleOpenDialog(patient)}
                  >
                    <Pencil className="w-4 h-4" />
                    تعديل
                  </Button>

                  <Button variant="destructive" size="icon" className="h-11 w-11 rounded-lg bg-[#ef4444] hover:bg-[#dc2626]">
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
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
