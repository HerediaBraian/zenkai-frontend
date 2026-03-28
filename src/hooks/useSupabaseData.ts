import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export function useClients() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useActivities() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["activities", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSchedules() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["schedules", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("schedules").select("*, activities(name, color, max_capacity)").order("start_time");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useEnrollments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["enrollments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("*, clients(name, last_name), activities(name), schedules(day_of_week, start_time)");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useAttendance(date?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["attendance", user?.id, date],
    queryFn: async () => {
      let query = supabase.from("attendance").select("*, clients(name, last_name), activities(name), schedules(start_time, day_of_week)");
      if (date) query = query.eq("date", date);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useIncome() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["income", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("income").select("*, clients(name, last_name), activities(name)").order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useFinancialConfig() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["financial_config", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("financial_config").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useUpsertFinancialConfig() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ myPercentage, rentPercentage }: { myPercentage: number; rentPercentage: number }) => {
      const { data, error } = await supabase.from("financial_config").upsert({
        user_id: user!.id,
        my_percentage: myPercentage,
        rent_percentage: rentPercentage,
      }, { onConflict: "user_id" }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial_config"] });
      toast.success("Distribución actualizada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useMutateClient() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return {
    create: useMutation({
      mutationFn: async (data: any) => {
        const { data: result, error } = await supabase.from("clients").insert({ ...data, user_id: user!.id }).select().single();
        if (error) throw error;
        return result;
      },
      onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); toast.success("Cliente creado"); },
      onError: (e: any) => toast.error(e.message),
    }),
    update: useMutation({
      mutationFn: async ({ id, ...data }: any) => {
        const { error } = await supabase.from("clients").update(data).eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); toast.success("Cliente actualizado"); },
      onError: (e: any) => toast.error(e.message),
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        // Delete related records first to avoid orphaned data
        await supabase.from("attendance").delete().eq("client_id", id);
        await supabase.from("enrollments").delete().eq("client_id", id);
        await supabase.from("income").delete().eq("client_id", id);
        const { error } = await supabase.from("clients").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["clients"] });
        qc.invalidateQueries({ queryKey: ["enrollments"] });
        qc.invalidateQueries({ queryKey: ["attendance"] });
        qc.invalidateQueries({ queryKey: ["income"] });
        toast.success("Cliente eliminado");
      },
      onError: (e: any) => toast.error(e.message),
    }),
  };
}

export function useMutateActivity() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return {
    create: useMutation({
      mutationFn: async (data: any) => {
        const { error } = await supabase.from("activities").insert({ ...data, user_id: user!.id });
        if (error) throw error;
      },
      onSuccess: () => { qc.invalidateQueries({ queryKey: ["activities"] }); toast.success("Actividad creada"); },
      onError: (e: any) => toast.error(e.message),
    }),
    update: useMutation({
      mutationFn: async ({ id, ...data }: any) => {
        const { error } = await supabase.from("activities").update(data).eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => { qc.invalidateQueries({ queryKey: ["activities"] }); toast.success("Actividad actualizada"); },
      onError: (e: any) => toast.error(e.message),
    }),
  };
}

export function useMutateSchedule() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return {
    create: useMutation({
      mutationFn: async (data: any) => {
        const { error } = await supabase.from("schedules").insert({ ...data, user_id: user!.id });
        if (error) throw error;
      },
      onSuccess: () => { qc.invalidateQueries({ queryKey: ["schedules"] }); toast.success("Horario creado"); },
      onError: (e: any) => toast.error(e.message),
    }),
    update: useMutation({
      mutationFn: async ({ id, ...data }: any) => {
        const { error } = await supabase.from("schedules").update(data).eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => { qc.invalidateQueries({ queryKey: ["schedules"] }); toast.success("Horario actualizado"); },
      onError: (e: any) => toast.error(e.message),
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from("schedules").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => { qc.invalidateQueries({ queryKey: ["schedules"] }); toast.success("Horario eliminado"); },
      onError: (e: any) => toast.error(e.message),
    }),
  };
}

export function useMutateIncome() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return {
    create: useMutation({
      mutationFn: async (data: any) => {
        const { error } = await supabase.from("income").insert({ ...data, user_id: user!.id });
        if (error) throw error;
      },
      onSuccess: () => { qc.invalidateQueries({ queryKey: ["income"] }); toast.success("Ingreso registrado"); },
      onError: (e: any) => toast.error(e.message),
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from("income").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => { qc.invalidateQueries({ queryKey: ["income"] }); toast.success("Ingreso eliminado"); },
      onError: (e: any) => toast.error(e.message),
    }),
  };
}

export function useMutateAttendance() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: { client_id: string; activity_id: string; schedule_id: string; date: string; status: string }) => {
      const { error } = await supabase.from("attendance").upsert({
        ...data,
        user_id: user!.id,
      }, { onConflict: "client_id,schedule_id,date" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["attendance"] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function usePredefinedMessages() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["predefined_messages", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("predefined_messages" as any).select("*").order("created_at");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });
}

export function useMutatePredefinedMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return {
    create: useMutation({
      mutationFn: async (data: { text: string }) => {
        const { error } = await supabase.from("predefined_messages" as any).insert({ ...data, user_id: user!.id } as any);
        if (error) throw error;
      },
      onSuccess: () => { qc.invalidateQueries({ queryKey: ["predefined_messages"] }); toast.success("Mensaje creado"); },
      onError: (e: any) => toast.error(e.message),
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from("predefined_messages" as any).delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => { qc.invalidateQueries({ queryKey: ["predefined_messages"] }); toast.success("Mensaje eliminado"); },
      onError: (e: any) => toast.error(e.message),
    }),
  };
}

export function useMutateEnrollment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return {
    create: useMutation({
      mutationFn: async (data: { client_id: string; activity_id: string; schedule_id: string }) => {
        const { error } = await supabase.from("enrollments").insert({ ...data, user_id: user!.id });
        if (error) throw error;
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["enrollments"] });
        qc.invalidateQueries({ queryKey: ["schedules"] });
        toast.success("Inscripción registrada");
      },
      onError: (e: any) => toast.error(e.message),
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from("enrollments").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["enrollments"] });
        qc.invalidateQueries({ queryKey: ["schedules"] });
        toast.success("Inscripción eliminada");
      },
      onError: (e: any) => toast.error(e.message),
    }),
  };
}
