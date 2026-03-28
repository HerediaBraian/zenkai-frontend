import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "active" | "inactive" | "pending";
}

const config = {
  active: { label: "Activo", className: "bg-success/10 text-success border-success/20 hover:bg-success/20" },
  inactive: { label: "Inactivo", className: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20" },
  pending: { label: "Pendiente", className: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = config[status];
  return <Badge variant="outline" className={className}>{label}</Badge>;
}
