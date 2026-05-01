import { Badge } from "@/components/ui/badge";

export type ClientLikeStatus = "active" | "inactive" | "pending";

interface StatusBadgeProps {
  /** Valor desde DB (string); valores desconocidos se muestran como Pendiente */
  status: string;
}

const config: Record<ClientLikeStatus, { label: string; className: string }> = {
  active: { label: "Activo", className: "bg-success/10 text-success border-success/20 hover:bg-success/20" },
  inactive: { label: "Inactivo", className: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20" },
  pending: { label: "Pendiente", className: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20" },
};

function normalizeStatus(s: string): ClientLikeStatus {
  if (s === "active" || s === "inactive" || s === "pending") return s;
  return "pending";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const key = normalizeStatus(status);
  const { label, className } = config[key];
  return <Badge variant="outline" className={className}>{label}</Badge>;
}
