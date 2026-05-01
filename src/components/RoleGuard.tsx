import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentRole, AppRole } from "@/hooks/useRole";

interface Props {
  allow: AppRole[];
  children: ReactNode;
  redirectTo?: string;
}

export function RoleGuard({ allow, children, redirectTo = "/" }: Props) {
  const { role, loading } = useCurrentRole();
  if (loading) return null;
  if (!role || !allow.includes(role)) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}