import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useWodResults } from "@/hooks/useWods";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { WodResultWithRelations } from "@/types/db";

interface Props {
  clientId: string | null;
  clientName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ClientWodProgressDialog({ clientId, clientName, open, onOpenChange }: Props) {
  const { data: results = [], isLoading } = useWodResults(undefined, clientId || undefined);

  // Group by WOD for chart
  const { chartData, wodNames, prMap } = useMemo(() => {
    const byWod: Record<string, { name: string; entries: WodResultWithRelations[] }> = {};
    for (const r of results as WodResultWithRelations[]) {
      const name = r.wods?.name || "WOD";
      if (!byWod[r.wod_id]) byWod[r.wod_id] = { name, entries: [] };
      byWod[r.wod_id].entries.push(r);
    }
    // Sort each by date asc
    for (const k of Object.keys(byWod)) {
      byWod[k].entries.sort((a, b) => a.date.localeCompare(b.date));
    }

    // Merge dates to single chart by date with one series per wod
    const allDates = Array.from(new Set(results.map((r) => r.date))).sort();
    const chartData = allDates.map((d) => {
      const row: Record<string, string | number> = { date: d };
      for (const k of Object.keys(byWod)) {
        const entry = byWod[k].entries.find((e) => e.date === d);
        if (entry?.result_value != null) row[byWod[k].name] = Number(entry.result_value);
      }
      return row;
    });

    const wodNames = Object.values(byWod).map((b) => b.name);

    // PR per wod (max numeric)
    const prMap: Record<string, number> = {};
    for (const k of Object.keys(byWod)) {
      const nums = byWod[k].entries
        .map((e) => (e.result_value != null ? Number(e.result_value) : null))
        .filter((n): n is number => n != null);
      if (nums.length) prMap[byWod[k].name] = Math.max(...nums);
    }

    return { chartData, wodNames, prMap };
  }, [results]);

  const colors = ["hsl(var(--primary))", "hsl(160, 84%, 39%)", "hsl(40, 90%, 50%)", "hsl(280, 70%, 55%)", "hsl(0, 75%, 55%)"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Progreso WODs · {clientName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Este cliente todavía no tiene resultados de WOD registrados.
          </p>
        ) : (
          <div className="space-y-6">
            {chartData.length > 0 && wodNames.length > 0 && (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    {wodNames.map((name, i) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={colors[i % colors.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-2">Historial</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>WOD</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(results as WodResultWithRelations[]).map((r) => {
                    const wodName = r.wods?.name || "WOD";
                    const isPR = r.result_value != null && Number(r.result_value) === prMap[wodName];
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{r.date}</TableCell>
                        <TableCell className="text-sm font-medium">{wodName}</TableCell>
                        <TableCell className="text-sm">{r.result_text || (r.result_value ?? "—")}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.notes || "—"}</TableCell>
                        <TableCell>{isPR && <Badge className="bg-success">PR</Badge>}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}