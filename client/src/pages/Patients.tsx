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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, UserPlus, Pencil, Phone, MapPin, AlertCircle, Pill, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Patients() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold font-tajawal text-slate-900">سجلات المرضى</h1>
          <p className="text-slate-500 mt-2">إدارة قاعدة بيانات المرضى وملفاتهم الطبية.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="shadow-lg shadow-primary/20 h-12 px-6">
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

      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">قائمة المرضى</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="بحث بالاسم أو رقم الهاتف..." 
              className="pr-10 bg-white" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center p-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>لا يوجد مرضى مطابقين للبحث</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">رقم الهاتف</TableHead>
                    <TableHead className="text-right">العمر / الجنس</TableHead>
                    <TableHead className="text-right">تنبيهات طبية</TableHead>
                    <TableHead className="text-center w-[100px]">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-slate-800">{patient.fullName}</TableCell>
                      <TableCell dir="ltr" className="text-right">{patient.phone}</TableCell>
                      <TableCell>
                        {patient.age} سنة / {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          {patient.allergies && (
                            <Badge variant="destructive" className="flex items-center gap-1 text-[10px]">
                              <AlertCircle className="w-3 h-3" /> حساسية
                            </Badge>
                          )}
                          {patient.chronicDiseases && (
                            <Badge variant="outline" className="flex items-center gap-1 text-[10px] border-orange-200 bg-orange-50 text-orange-700">
                              <ActivityIcon className="w-3 h-3" /> مزمن
                            </Badge>
                          )}
                          {patient.currentMeds && (
                            <Badge variant="outline" className="flex items-center gap-1 text-[10px] border-blue-200 bg-blue-50 text-blue-700">
                              <Pill className="w-3 h-3" /> أدوية
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(patient)}>
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
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
