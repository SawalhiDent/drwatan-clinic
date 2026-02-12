import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertAppointment, type Appointment } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useAppointments(date?: string) {
  return useQuery({
    queryKey: [api.appointments.list.path, date],
    queryFn: async () => {
      let url = api.appointments.list.path;
      if (date) {
        url += `?date=${date}`;
      }
      const res = await apiRequest("GET", url);
      return api.appointments.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertAppointment) => {
      const res = await apiRequest(api.appointments.create.method, api.appointments.create.path, data);
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
      await apiRequest(api.appointments.delete.method, url);
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
