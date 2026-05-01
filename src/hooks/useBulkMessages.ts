import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { getErrorMessage } from "@/lib/getErrorMessage";

export function useBulkMessageLogs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["bulk_message_logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_message_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Tables<"bulk_message_logs">[];
    },
    enabled: !!user,
  });
}

export function useCreateBulkMessageLog() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: {
      message_text: string;
      total_recipients: number;
      sent_count: number;
      failed_count: number;
      recipient_ids: string[];
      sent_ids: string[];
      failed_ids: string[];
    }) => {
      const { error } = await supabase.from("bulk_message_logs").insert({
        ...data,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bulk_message_logs"] });
      toast.success("Envío registrado en el historial");
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
