import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Enums } from "@/integrations/supabase/types";

export type AppRole = "super_admin" | "admin" | "usuario";

export function useRoles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_roles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      const rows = (data ?? []) as { role: Enums<"app_role"> }[];
      return rows.map((r) => r.role as AppRole);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCurrentRole(): {
  role: AppRole | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isUsuario: boolean;
  loading: boolean;
} {
  const { data: roles, isLoading } = useRoles();
  const set = new Set(roles || []);
  const isSuperAdmin = set.has("super_admin");
  const isAdmin = set.has("admin");
  const role: AppRole | null = isSuperAdmin
    ? "super_admin"
    : isAdmin
    ? "admin"
    : set.has("usuario")
    ? "usuario"
    : null;
  return {
    role,
    isSuperAdmin,
    isAdmin,
    isUsuario: role === "usuario",
    loading: isLoading,
  };
}

/** Returns true if current role is allowed for any of the given roles */
export function useHasAccess(allowed: AppRole[]): boolean {
  const { role } = useCurrentRole();
  if (!role) return false;
  return allowed.includes(role);
}