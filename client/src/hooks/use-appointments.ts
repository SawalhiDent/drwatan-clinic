import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertAppointment, type Appointment } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useAppointments(date?: string) {
  return useQuery({
    queryKey: [api.appointments.list.path, date],
    queryFn: async () => {
      // Build URL with query params if date exists
      let url = api.appointments.list.path;
      if (date) {
        url += `?date=${date}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("فشل في تحميل المواعيد");
      return api.appointments.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertAppointment) => {
      const res = await fetch(api.appointments.create.path, {
        method: api.appointments.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 409) throw new Error("عذراً، هذا الموعد محجوز مسبقاً");
        if (res.status === 400) throw new Error("بيانات الحجز غير مكتملة");
        throw new Error("فشل في حجز الموعد");
      }
      return api.appointments.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
      toast({
        title: "تم الحجز بنجاح",
        description: "تم تسجيل الموعد في النظام",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "خطأ في الحجز",
        description: error.message,
      });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.appointments.delete.path, { id });
      const res = await fetch(url, {
        method: api.appointments.delete.method,
      });

      if (!res.ok) throw new Error("فشل في إلغاء الموعد");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
      toast({
        title: "تم الإلغاء",
        description: "تم إلغاء الموعد بنجاح",
      });
    },
  });
}
