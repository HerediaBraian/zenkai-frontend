interface OccupancyBarProps {
  current: number;
  max: number;
  label?: string;
}

export function OccupancyBar({ current, max, label }: OccupancyBarProps) {
  const pct = Math.round((current / max) * 100);
  const color = pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-warning" : "bg-primary";

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{current}/{max}</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-muted">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
