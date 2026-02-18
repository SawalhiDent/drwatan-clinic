import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { api } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WhatsappTemplate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  MessageSquare,
  Clock,
  Receipt,
  Syringe,
  Wrench,
  Sparkles,
  Brush,
  MessageCircle,
  Info,
  type LucideIcon,
} from "lucide-react";

const ICON_OPTIONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: "Clock", label: "ساعة", Icon: Clock },
  { value: "Receipt", label: "فاتورة", Icon: Receipt },
  { value: "Syringe", label: "حقنة", Icon: Syringe },
  { value: "Wrench", label: "مفتاح", Icon: Wrench },
  { value: "Sparkles", label: "لمعان", Icon: Sparkles },
  { value: "Brush", label: "فرشاة", Icon: Brush },
  { value: "MessageCircle", label: "رسالة", Icon: MessageCircle },
  { value: "MessageSquare", label: "محادثة", Icon: MessageSquare },
];

const ICON_MAP: Record<string, LucideIcon> = {
  Clock, Receipt, Syringe, Wrench, Sparkles, Brush, MessageCircle, MessageSquare,
};

const VARIABLES_INFO = [
  { var: "{name}", desc: "اسم المريض" },
  { var: "{date}", desc: "تاريخ الموعد" },
  { var: "{time}", desc: "وقت الموعد" },
  { var: "{service}", desc: "نوع الخدمة" },
  { var: "{total_paid}", desc: "المبلغ المدفوع" },
  { var: "{currency}", desc: "العملة" },
  { var: "{payments_list}", desc: "قائمة المدفوعات" },
];

interface TemplateFormData {
  label: string;
  templateKey: string;
  iconName: string;
  messageBody: string;
  needsAppointment: boolean;
  sortOrder: number;
}

const emptyForm: TemplateFormData = {
  label: "",
  templateKey: "",
  iconName: "MessageCircle",
  messageBody: "",
  needsAppointment: false,
  sortOrder: 0,
};

export default function WhatsAppTemplatesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsappTemplate | null>(null);
  const [form, setForm] = useState<TemplateFormData>(emptyForm);

  const { data: templates, isLoading } = useQuery<WhatsappTemplate[]>({
    queryKey: [api.whatsappTemplates.list.path],
  });

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      await apiRequest("POST", api.whatsappTemplates.create.path, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.whatsappTemplates.list.path] });
      toast({ title: "تم إنشاء القالب بنجاح" });
      closeDialog();
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TemplateFormData> }) => {
      await apiRequest("PUT", `/api/whatsapp-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.whatsappTemplates.list.path] });
      toast({ title: "تم تحديث القالب بنجاح" });
      closeDialog();
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/whatsapp-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.whatsappTemplates.list.path] });
      toast({ title: "تم حذف القالب" });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    setForm(emptyForm);
  };

  const openCreateDialog = () => {
    setEditingTemplate(null);
    const maxOrder = templates?.reduce((max, t) => Math.max(max, t.sortOrder ?? 0), 0) ?? 0;
    setForm({ ...emptyForm, sortOrder: maxOrder + 1 });
    setDialogOpen(true);
  };

  const openEditDialog = (template: WhatsappTemplate) => {
    setEditingTemplate(template);
    setForm({
      label: template.label,
      templateKey: template.templateKey,
      iconName: template.iconName,
      messageBody: template.messageBody,
      needsAppointment: template.needsAppointment ?? false,
      sortOrder: template.sortOrder ?? 0,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.label || !form.templateKey || !form.messageBody) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold font-tajawal text-slate-900" data-testid="text-page-title">
              قوالب رسائل واتساب
            </h1>
            <p className="text-slate-500 text-sm mt-1">إدارة وتعديل قوالب الرسائل المرسلة عبر واتساب</p>
          </div>
          <Button
            className="bg-[#0e8bab] gap-2"
            onClick={openCreateDialog}
            data-testid="button-add-template"
          >
            <Plus className="w-4 h-4" />
            إضافة قالب جديد
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
              <Info className="w-4 h-4" />
              المتغيرات المتاحة في نص الرسالة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {VARIABLES_INFO.map((v) => (
                <Badge key={v.var} variant="secondary" className="text-xs gap-1">
                  <code className="font-mono text-[10px]">{v.var}</code>
                  <span className="text-muted-foreground">- {v.desc}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="grid gap-4">
            {templates.map((template) => {
              const Icon = ICON_MAP[template.iconName] || MessageCircle;
              return (
                <Card key={template.id} data-testid={`template-card-${template.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="bg-green-50 p-2.5 rounded-lg shrink-0 mt-0.5">
                          <Icon className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900" data-testid={`text-template-label-${template.id}`}>
                              {template.label}
                            </h3>
                            {template.needsAppointment && (
                              <Badge variant="outline" className="text-[10px]">يتطلب موعد</Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px]">
                              ترتيب: {template.sortOrder}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 font-mono">{template.templateKey}</p>
                          <pre
                            className="mt-2 text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100 max-h-40 overflow-y-auto"
                            dir="rtl"
                            data-testid={`text-template-body-${template.id}`}
                          >
                            {template.messageBody}
                          </pre>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(template)}
                          data-testid={`button-edit-template-${template.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              data-testid={`button-delete-template-${template.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف القالب</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من حذف قالب "{template.label}"؟ لا يمكن التراجع عن هذا الإجراء.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(template.id)}
                                className="bg-red-500 hover:bg-red-600"
                                data-testid="button-confirm-delete"
                              >
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد قوالب رسائل</p>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "تعديل القالب" : "إضافة قالب جديد"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم القالب *</Label>
                  <Input
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="مثال: تعليمات بعد الخلع"
                    data-testid="input-template-label"
                  />
                </div>
                <div className="space-y-2">
                  <Label>المعرّف (بالإنجليزية) *</Label>
                  <Input
                    value={form.templateKey}
                    onChange={(e) => setForm({ ...form, templateKey: e.target.value.replace(/\s/g, "_").toLowerCase() })}
                    placeholder="مثال: extraction_instructions"
                    dir="ltr"
                    data-testid="input-template-key"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الأيقونة</Label>
                  <Select value={form.iconName} onValueChange={(v) => setForm({ ...form, iconName: v })}>
                    <SelectTrigger data-testid="select-template-icon">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.Icon className="w-4 h-4" />
                            <span>{opt.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الترتيب</Label>
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                    data-testid="input-template-order"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={form.needsAppointment}
                  onCheckedChange={(v) => setForm({ ...form, needsAppointment: v })}
                  data-testid="switch-needs-appointment"
                />
                <Label>يتطلب بيانات موعد (التاريخ والوقت)</Label>
              </div>

              <div className="space-y-2">
                <Label>نص الرسالة *</Label>
                <Textarea
                  value={form.messageBody}
                  onChange={(e) => setForm({ ...form, messageBody: e.target.value })}
                  placeholder="اكتب نص الرسالة هنا... استخدم {name} لاسم المريض"
                  rows={10}
                  className="font-mono text-sm"
                  data-testid="input-template-body"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                إلغاء
              </Button>
              <Button
                className="bg-[#0e8bab] gap-2"
                onClick={handleSave}
                disabled={isSaving}
                data-testid="button-save-template"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingTemplate ? "حفظ التعديلات" : "إنشاء القالب"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
