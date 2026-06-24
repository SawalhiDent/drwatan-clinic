import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Search, Upload, X, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import type { Patient, DailyEntry } from "@shared/schema";

const DENTAL_SERVICES = [
  { value: "كشف عام", label: "كشف عام" },
  { value: "تنظيف", label: "تنظيف" },
  { value: "حشوة", label: "حشوة" },
  { value: "علاج جذور", label: "علاج جذور" },
  { value: "خلع", label: "خلع" },
  { value: "تركيبات", label: "تركيبات" },
  { value: "تقويم", label: "تقويم" },
  { value: "زراعة", label: "زراعة" },
  { value: "تبييض أسنان", label: "تبييض أسنان" },
  { value: "جراحة", label: "جراحة" },
  { value: "أشعة", label: "أشعة" },
  { value: "متابعة", label: "متابعة" },
];

const AESTHETIC_SERVICES = [
  { value: "بوتوكس", label: "بوتوكس" },
  { value: "فيلر", label: "فيلر" },
  { value: "نضارة بشرة", label: "نضارة بشرة" },
  { value: "ليزر", label: "ليزر" },
  { value: "تفتيح بشرة", label: "تفتيح بشرة" },
  { value: "مزيل تجاعيد", label: "مزيل تجاعيد" },
  { value: "شد وجه", label: "شد وجه" },
  { value: "تكبير شفاه", label: "تكبير شفاه" },
  { value: "حقن دهون", label: "حقن دهون" },
  { value: "PRP", label: "PRP" },
  { value: "تقشير كيميائي", label: "تقشير كيميائي" },
  { value: "ميزوثيرابي", label: "ميزوثيرابي" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "كاش 💵" },
  { value: "check", label: "شيك 📄" },
  { value: "visa", label: "فيزا 💳" },
  { value: "bpay", label: "بييت 📱" },
];

interface AddDailyEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  editingEntry?: DailyEntry | null;
  onSuccess?: () => void;
}

export function AddDailyEntryDialog({ open, onOpenChange, date, editingEntry, onSuccess }: AddDailyEntryDialogProps) {
  const { toast } = useToast();
  const formattedDate = format(date, "yyyy-MM-dd");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: doctors } = useQuery<{ id: number; displayName: string; role: string }[]>({
    queryKey: ["/api/doctors"],
    staleTime: 0,
  });

  const [patientName, setPatientName] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [clinicType, setClinicType] = useState<"أسنان" | "تجميل">("أسنان");
  const [treatment, setTreatment] = useState("");
  const [doctor, setDoctor] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("₪");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [checkImages, setCheckImages] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: patientResults } = useQuery<Patient[]>({
    queryKey: [`/api/patients?search=${encodeURIComponent(patientSearch)}`],
    enabled: patientSearch.length >= 2,
  });

  const currentServices = clinicType === "أسنان" ? DENTAL_SERVICES : AESTHETIC_SERVICES;

  useEffect(() => {
    if (open) {
      if (editingEntry) {
        setPatientName(editingEntry.patientName);
        setTreatment(editingEntry.treatment || "");
        setDoctor(editingEntry.doctor || "");
        setAmount(editingEntry.amount ? String(editingEntry.amount) : "");
        setCurrency(editingEntry.currency || "₪");
        setPaymentMethod(editingEntry.paymentMethod || "cash");
        setNotes(editingEntry.notes || "");
        // Detect clinic type from existing treatment
        const isAesthetic = AESTHETIC_SERVICES.some(s => s.value === editingEntry.treatment);
        setClinicType(isAesthetic ? "تجميل" : "أسنان");
        try {
          setCheckImages(editingEntry.checkImages ? JSON.parse(editingEntry.checkImages) : []);
        } catch {
          setCheckImages([]);
        }
      } else {
        setPatientName("");
        setSelectedPatientId(null);
        setClinicType("أسنان");
        setTreatment("");
        setDoctor("");
        setAmount("");
        setCurrency("₪");
        setPaymentMethod("cash");
        setCheckImages([]);
        setNotes("");
      }
      setPatientSearch("");
      setShowSuggestions(false);
    }
  }, [open, editingEntry]);

  // Reset treatment when clinic type changes
  useEffect(() => {
    setTreatment("");
  }, [clinicType]);

  const handlePatientInput = useCallback((val: string) => {
    setPatientName(val);
    setSelectedPatientId(null);
    setPatientSearch(val);
    setShowSuggestions(val.length >= 2);
  }, []);

  const selectPatient = useCallback((patient: Patient) => {
    setPatientName(patient.fullName);
    setSelectedPatientId(patient.id);
    setPatientSearch("");
    setShowSuggestions(false);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (checkImages.length + files.length > 3) {
      toast({ title: "الحد الأقصى 3 صور للشيك", variant: "destructive" });
      return;
    }
    files.forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setCheckImages(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    setCheckImages(prev => prev.filter((_, i) => i !== idx));
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", api.dailyEntries.create.path, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${api.dailyEntries.list.path}?date=${formattedDate}`] });
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      if (selectedPatientId) {
        queryClient.invalidateQueries({ queryKey: [api.patients.get.path, selectedPatientId] });
      }
      toast({ title: "تم إضافة السجل بنجاح" });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", api.dailyEntries.update.path.replace(":id", String(id)), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${api.dailyEntries.list.path}?date=${formattedDate}`] });
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      toast({ title: "تم تحديث السجل" });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  function handleSave() {
    if (!patientName.trim()) {
      toast({ title: "أدخل اسم المريض", variant: "destructive" });
      return;
    }
    const data = {
      date: formattedDate,
      time: null,
      patientId: selectedPatientId || null,
      patientName: patientName.trim(),
      treatment: treatment || null,
      doctor: doctor || null,
      amount: amount ? Number(amount) : 0,
      currency,
      paymentMethod,
      checkImages: paymentMethod === "check" && checkImages.length > 0 ? JSON.stringify(checkImages) : null,
      notes: notes.trim() || null,
    };
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-tajawal">
            {editingEntry ? "تعديل السجل" : "إضافة سجل جديد"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">

          {/* Patient Search */}
          <div className="relative">
            <Label>اسم المريض *</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <Input
                ref={inputRef}
                value={patientName}
                onChange={(e) => handlePatientInput(e.target.value)}
                onFocus={() => { if (patientName.length >= 2) setShowSuggestions(true); }}
                placeholder="ابحث أو اكتب اسم المريض"
                className="pr-9"
                data-testid="input-entry-patient"
              />
            </div>
            {showSuggestions && patientResults && patientResults.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                data-testid="patient-suggestions"
              >
                {patientResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPatient(p)}
                    className="w-full text-right px-3 py-2 hover:bg-slate-50 flex items-center justify-between gap-2 border-b border-slate-50 last:border-b-0"
                    data-testid={`suggestion-patient-${p.id}`}
                  >
                    <span className="font-bold text-slate-800">{p.fullName}</span>
                    <span className="text-xs text-slate-400">{p.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clinic Type Selector */}
          <div>
            <Label className="mb-2 block">نوع العيادة</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setClinicType("أسنان")}
                data-testid="clinic-type-dental"
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border-2 font-bold text-sm transition-all ${
                  clinicType === "أسنان"
                    ? "bg-[#8B2342] text-white border-[#8B2342]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-[#8B2342]"
                }`}
              >
                🦷 أسنان
              </button>
              <button
                type="button"
                onClick={() => setClinicType("تجميل")}
                data-testid="clinic-type-aesthetic"
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border-2 font-bold text-sm transition-all ${
                  clinicType === "تجميل"
                    ? "bg-[#8B2342] text-white border-[#8B2342]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-[#8B2342]"
                }`}
              >
                ✨ تجميل
              </button>
            </div>
          </div>

          {/* Treatment & Doctor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>العلاج</Label>
              <Select value={treatment} onValueChange={setTreatment}>
                <SelectTrigger data-testid="select-entry-treatment">
                  <SelectValue placeholder="اختر العلاج" />
                </SelectTrigger>
                <SelectContent>
                  {currentServices.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الطبيب</Label>
              <Select value={doctor} onValueChange={setDoctor}>
                <SelectTrigger data-testid="select-entry-doctor">
                  <SelectValue placeholder="اختر الطبيب" />
                </SelectTrigger>
                <SelectContent>
                  {(doctors || []).map((doc) => (
                    <SelectItem key={doc.id} value={doc.displayName}>{doc.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amount + Payment + Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>المبلغ المدفوع</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                data-testid="input-entry-amount"
              />
            </div>
            <div>
              <Label>طريقة الدفع</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger data-testid="select-entry-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>العملة</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger data-testid="select-entry-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="₪">₪ شيكل</SelectItem>
                  <SelectItem value="$">$ دولار</SelectItem>
                  <SelectItem value="د.أ">د.أ دينار</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cheque Image Upload — shows only when check is selected */}
          {paymentMethod === "check" && (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 bg-slate-50">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-slate-500" />
                <Label className="text-slate-700 font-semibold">صور الشيك (اختياري، حد أقصى 3)</Label>
              </div>

              {/* Image Previews */}
              {checkImages.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-2">
                  {checkImages.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                      <img src={img} alt={`شيك ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-0.5 left-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md hover:bg-red-600"
                        data-testid={`remove-check-image-${idx}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              {checkImages.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-check-image"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-[#8B2342] hover:text-[#8B2342] transition-colors w-full justify-center"
                >
                  <Upload className="w-4 h-4" />
                  {checkImages.length === 0 ? "إرفاق صورة الشيك" : "إضافة صورة أخرى"}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
                data-testid="input-check-image-file"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>ملاحظات</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية"
              data-testid="input-entry-notes"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={!patientName.trim() || createMutation.isPending || updateMutation.isPending}
            className="w-full"
            data-testid="button-save-entry"
          >
            {(createMutation.isPending || updateMutation.isPending) && (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            )}
            {editingEntry ? "تحديث" : "إضافة"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
