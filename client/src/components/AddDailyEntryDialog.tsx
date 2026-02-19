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
import { Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import type { Patient, DailyEntry } from "@shared/schema";

const SERVICES = [
  { value: "كشف عام", label: "كشف عام" },
  { value: "تنظيف", label: "تنظيف" },
  { value: "حشوة", label: "حشوة" },
  { value: "علاج جذور", label: "علاج جذور" },
  { value: "خلع", label: "خلع" },
  { value: "تركيبات", label: "تركيبات" },
  { value: "تقويم", label: "تقويم" },
  { value: "زراعة", label: "زراعة" },
  { value: "تبييض", label: "تبييض" },
  { value: "جراحة", label: "جراحة" },
  { value: "أشعة", label: "أشعة" },
  { value: "متابعة", label: "متابعة" },
  { value: "أخرى", label: "أخرى" },
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

  const { data: doctors } = useQuery<{ id: number; displayName: string; role: string }[]>({
    queryKey: ["/api/doctors"],
  });

  const [patientName, setPatientName] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [treatment, setTreatment] = useState("");
  const [doctor, setDoctor] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("₪");
  const [notes, setNotes] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: patientResults } = useQuery<Patient[]>({
    queryKey: [`/api/patients?search=${encodeURIComponent(patientSearch)}`],
    enabled: patientSearch.length >= 2,
  });

  useEffect(() => {
    if (open) {
      if (editingEntry) {
        setPatientName(editingEntry.patientName);
        setTreatment(editingEntry.treatment || "");
        setDoctor(editingEntry.doctor || "");
        setAmount(editingEntry.amount ? String(editingEntry.amount) : "");
        setCurrency(editingEntry.currency || "₪");
        setNotes(editingEntry.notes || "");
      } else {
        setPatientName("");
        setSelectedPatientId(null);
        setTreatment("");
        setDoctor("");
        setAmount("");
        setCurrency("₪");
        setNotes("");
      }
      setPatientSearch("");
      setShowSuggestions(false);
    }
  }, [open, editingEntry]);

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

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", api.dailyEntries.create.path, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${api.dailyEntries.list.path}?date=${formattedDate}`] });
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-tajawal">
            {editingEntry ? "تعديل السجل" : "إضافة سجل جديد"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
                    className="w-full text-right px-3 py-2 hover-elevate flex items-center justify-between gap-2 border-b border-slate-50 last:border-b-0"
                    data-testid={`suggestion-patient-${p.id}`}
                  >
                    <span className="font-bold text-slate-800">{p.fullName}</span>
                    <span className="text-xs text-slate-400">{p.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>العلاج</Label>
              <Select value={treatment} onValueChange={setTreatment}>
                <SelectTrigger data-testid="select-entry-treatment">
                  <SelectValue placeholder="اختر العلاج" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICES.map((s) => (
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
          <div className="grid grid-cols-2 gap-3">
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
