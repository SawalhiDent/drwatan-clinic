import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/Layout";
import { PERMISSIONS, PERMISSION_LABELS, type Permission } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, UserCircle2, Shield, Pencil, Trash2, Users, Phone, Banknote, Percent, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير",
  doctor: "طبيب",
  assistant: "مساعد",
};

type SafeUser = {
  id: number;
  username: string;
  displayName: string;
  role: string;
  permissions: Permission[];
  active: boolean | null;
  phone: string | null;
  salary: number | null;
  commissionRate: number | null;
  showInBooking: boolean | null;
};

export default function UsersPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<SafeUser | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("assistant");
  const [selectedPerms, setSelectedPerms] = useState<Permission[]>([]);
  const [phone, setPhone] = useState("");
  const [salary, setSalary] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [showInBooking, setShowInBooking] = useState(true);

  const { data: users = [], isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "✅ تم إضافة المستخدم بنجاح", variant: "success" as any });
      resetForm();
      setDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "✅ تم تحديث المستخدم بنجاح", variant: "success" as any });
      resetForm();
      setDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "🗑️ تم حذف المستخدم", variant: "success" as any });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setDisplayName("");
    setRole("assistant");
    setSelectedPerms([]);
    setPhone("");
    setSalary("");
    setCommissionRate("");
    setShowInBooking(true);
    setEditUser(null);
  };

  const openAdd = () => {
    resetForm();
    setEditUser(null);
    setDialogOpen(true);
  };

  const openEdit = (u: SafeUser) => {
    setEditUser(u);
    setUsername(u.username);
    setDisplayName(u.displayName);
    setRole(u.role);
    setSelectedPerms(u.permissions || []);
    setPhone(u.phone || "");
    setSalary(u.salary ? String(u.salary) : "");
    setCommissionRate(u.commissionRate ? String(u.commissionRate) : "");
    setShowInBooking(u.showInBooking !== false);
    setPassword("");
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const extraFields = {
      phone,
      salary: salary ? Number(salary) : 0,
      commissionRate: commissionRate ? Number(commissionRate) : 0,
      showInBooking,
    };
    if (editUser) {
      const data: any = { displayName, role, permissions: selectedPerms, ...extraFields };
      if (password) data.password = password;
      updateMutation.mutate({ id: editUser.id, data });
    } else {
      createMutation.mutate({ username, password, displayName, role, permissions: selectedPerms, ...extraFields });
    }
  };

  const togglePerm = (perm: Permission) => {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const toggleAll = () => {
    if (selectedPerms.length === PERMISSIONS.length) {
      setSelectedPerms([]);
    } else {
      setSelectedPerms([...PERMISSIONS]);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-tajawal text-slate-900">إدارة المستخدمين</h1>
            <p className="text-slate-500 mt-1 text-sm">إضافة وتعديل الأطباء والمساعدين وصلاحياتهم</p>
          </div>
          <Button onClick={openAdd} data-testid="button-add-user">
            <Plus className="w-4 h-4 ml-2" />
            إضافة مستخدم
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>لا يوجد مستخدمون</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {users.map((u) => (
              <Card key={u.id} className="border-0 shadow-lg shadow-slate-200/50" data-testid={`card-user-${u.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      u.role === "admin" ? "bg-purple-100" : u.role === "doctor" ? "bg-rose-100" : "bg-green-100"
                    )}>
                      {u.role === "admin" ? (
                        <Shield className="w-5 h-5 text-purple-600" />
                      ) : (
                        <UserCircle2 className={cn("w-5 h-5", u.role === "doctor" ? "text-rose-700" : "text-green-600")} />
                      )}
                    </div>

                    <div className="min-w-[120px]">
                      <h3 className="font-bold text-slate-800">{u.displayName}</h3>
                      <span className="text-xs text-slate-400">@{u.username}</span>
                      {u.role === "doctor" && (u.phone || u.salary || u.commissionRate) && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {u.phone && (
                            <span className="text-xs text-slate-500 flex items-center gap-0.5">
                              <Phone className="w-3 h-3" /> {u.phone}
                            </span>
                          )}
                          {(u.salary ?? 0) > 0 && (
                            <span className="text-xs text-emerald-600 flex items-center gap-0.5">
                              <Banknote className="w-3 h-3" /> {u.salary?.toLocaleString()} ₪
                            </span>
                          )}
                          {(u.commissionRate ?? 0) > 0 && (
                            <span className="text-xs text-rose-700 flex items-center gap-0.5">
                              <Percent className="w-3 h-3" /> {u.commissionRate}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs shrink-0",
                        u.role === "admin" ? "bg-purple-50 text-purple-700" :
                        u.role === "doctor" ? "bg-rose-50 text-rose-800" :
                        "bg-green-50 text-green-700"
                      )}
                    >
                      {ROLE_LABELS[u.role] || u.role}
                    </Badge>

                    <div className="flex flex-wrap gap-1.5 flex-1">
                      {u.role === "admin" ? (
                        <Badge variant="outline" className="text-xs bg-purple-50/50">جميع الصلاحيات</Badge>
                      ) : (
                        (u.permissions || []).map((perm) => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {PERMISSION_LABELS[perm as Permission] || perm}
                          </Badge>
                        ))
                      )}
                      {u.role !== "admin" && (!u.permissions || u.permissions.length === 0) && (
                        <span className="text-xs text-slate-400">لا توجد صلاحيات</span>
                      )}
                    </div>

                    {u.role !== "admin" && (
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {/* Quick toggle: show/hide in booking */}
                        <div
                          className={cn(
                            "flex items-center gap-2 rounded-xl px-3 py-2 border-2 transition-all duration-200",
                            u.showInBooking !== false
                              ? "bg-emerald-50 border-emerald-300"
                              : "bg-slate-100 border-slate-300"
                          )}
                        >
                          <CalendarCheck className={cn("w-4 h-4 shrink-0", u.showInBooking !== false ? "text-emerald-600" : "text-slate-400")} />
                          <div className="flex flex-col leading-none">
                            <span className="text-[10px] text-slate-500 font-medium">ظهور عند الحجز</span>
                            <span className={cn("text-xs font-bold", u.showInBooking !== false ? "text-emerald-700" : "text-slate-500")}>
                              {u.showInBooking !== false ? "✅ مفعّل" : "⛔ موقوف"}
                            </span>
                          </div>
                          <Switch
                            checked={u.showInBooking !== false}
                            onCheckedChange={(val) =>
                              updateMutation.mutate({ id: u.id, data: { showInBooking: val } })
                            }
                            data-testid={`switch-show-in-booking-${u.id}`}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(u)}
                          data-testid={`button-edit-user-${u.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5 ml-1" />
                          تعديل
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200"
                          onClick={() => {
                            if (confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
                              deleteMutation.mutate(u.id);
                            }
                          }}
                          data-testid={`button-delete-user-${u.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 ml-1" />
                          حذف
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogContent className="max-w-lg bg-slate-50" dir="rtl">
            <DialogHeader>
              <DialogTitle className="font-tajawal text-xl">
                {editUser ? "تعديل مستخدم" : "إضافة مستخدم جديد"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="مثال: د. أحمد"
                    required
                    data-testid="input-display-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>اسم المستخدم</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثال: ahmed"
                    required
                    disabled={!!editUser}
                    data-testid="input-new-username"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{editUser ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"}</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="****"
                    required={!editUser}
                    data-testid="input-new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الدور</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger data-testid="select-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="doctor">طبيب</SelectItem>
                      <SelectItem value="assistant">مساعد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {role === "doctor" && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>رقم الهاتف</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="05xxxxxxxx"
                      data-testid="input-user-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الراتب الثابت (₪)</Label>
                    <Input
                      type="number"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      placeholder="0"
                      data-testid="input-user-salary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>نسبة العمولة (%)</Label>
                    <Input
                      type="number"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value)}
                      placeholder="0"
                      min="0"
                      max="100"
                      data-testid="input-user-commission"
                    />
                  </div>
                </div>
              )}

              {/* Show in Booking toggle */}
              <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-2">
                  <CalendarCheck className={cn("w-4 h-4", showInBooking ? "text-emerald-600" : "text-slate-400")} />
                  <div>
                    <Label className="font-semibold text-sm">الظهور عند الحجز والسجل اليومي</Label>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {showInBooking ? "يظهر في قائمة الأطباء عند الحجز" : "مخفي من قائمة الأطباء"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={showInBooking}
                  onCheckedChange={setShowInBooking}
                  data-testid="switch-form-show-in-booking"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-bold">الصلاحيات</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={toggleAll} data-testid="button-toggle-all-perms">
                    {selectedPerms.length === PERMISSIONS.length ? "إلغاء الكل" : "تحديد الكل"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 bg-white rounded-xl p-4 border border-slate-100">
                  {PERMISSIONS.filter(p => p !== "user_management").map((perm) => (
                    <label
                      key={perm}
                      className="flex items-center gap-2 cursor-pointer"
                      data-testid={`checkbox-perm-${perm}`}
                    >
                      <Checkbox
                        checked={selectedPerms.includes(perm)}
                        onCheckedChange={() => togglePerm(perm)}
                      />
                      <span className="text-sm text-slate-700">{PERMISSION_LABELS[perm]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isPending} data-testid="button-save-user">
                {isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                {editUser ? "حفظ التعديلات" : "إضافة المستخدم"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
