import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/getErrorMessage";

export function useWods() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wods", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wods")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useWodResults(wodId?: string, clientId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wod_results", user?.id, wodId, clientId],
    queryFn: async () => {
      let q = supabase
        .from("wod_results")
        .select("*, wods(name), clients(name, last_name)")
        .order("date", { ascending: false });
      if (wodId) q = q.eq("wod_id", wodId);
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useMutateWods() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return {
    create: useMutation({
      mutationFn: async (data: { name: string; description?: string }) => {
        const { error } = await supabase.from("wods").insert({ ...data, user_id: user!.id });
        if (error) throw error;
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["wods"] });
        toast.success("WOD creado");
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
    update: useMutation({
      mutationFn: async ({ id, ...data }: { id: string; name: string; description?: string }) => {
        const { error } = await supabase.from("wods").update(data).eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["wods"] });
        toast.success("WOD actualizado");
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from("wods").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["wods"] });
        qc.invalidateQueries({ queryKey: ["wod_results"] });
        toast.success("WOD eliminado");
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
  };
}

export function useMutateWodResults() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return {
    create: useMutation({
      mutationFn: async (data: {
        wod_id: string;
        client_id: string;
        date: string;
        result_value: number | null;
        result_text: string;
        notes?: string;
      }) => {
        const { error } = await supabase.from("wod_results").insert({ ...data, user_id: user!.id });
        if (error) throw error;
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["wod_results"] });
        toast.success("Resultado registrado");
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from("wod_results").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["wod_results"] });
        toast.success("Resultado eliminado");
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    }),
  };
}
