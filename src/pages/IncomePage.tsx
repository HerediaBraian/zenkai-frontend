import { useState, useMemo } from "react";
import { KpiCard } from "@/components/molecules/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, Building2, Plus, Trash2, Settings2 } from "lucide-react";
import { useIncome, useFinancialConfig, useUpsertFinancialConfig, useMutateIncome, useClients } from "@/hooks/useSupabaseData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";

export default function IncomePage() {
  const { data: incomeList = [] } = useIncome();
  const { data: config } = useFinancialConfig();
  const upsertConfig = useUpsertFinancialConfig();
  const { create, remove } = useMutateIncome();
  const { data: clients = [] } = useClients();

  const myPct = config?.my_percentage ?? 70;
  const rentPct = config?.rent_percentage ?? 30;

  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ amount: "", date: new Date().toISOString().split("T")[0], client_id: "", notes: "" });
  const [configForm, setConfigForm] = useState({ my: myPct.toString(), rent: rentPct.toString() });

  const total = useMemo(() => incomeList.reduce((s, i) => s + Number(i.amount), 0), [incomeList]);
  const mine = total * myPct / 100;
  const rent = total * rentPct / 100;

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    incomeList.forEach(i => { const m = i.date.slice(0, 7); map[m] = (map[m] || 0) + Number(i.amount); });
    return Object.entries(map).sort().map(([month, total]) => ({
      month: month.slice(5) + "/" + month.slice(2, 4),
      total, mine: total * myPct / 100, rent: total * rentPct / 100,
    }));
  }, [incomeList, myPct, rentPct]);

  const pieData = [
    { name: `Mi ganancia (${myPct}%)`, value: mine },
    { name: `Alquiler (${rentPct}%)`, value: rent },
  ];
  const pieColors = ["hsl(160, 84%, 39%)", "hsl(200, 80%, 55%)"];

  const handleSaveIncome = async () => {
    if (!incomeForm.amount) return;
    await create.mutateAsync({
      amount: parseFloat(incomeForm.amount),
      date: incomeForm.date,
      client_id: incomeForm.client_id || null,
      activity_id: null,
      notes: incomeForm.notes,
      period: "",
      income_type: "cuota",
    });
    setShowIncomeForm(false);
    setIncomeForm({ amount: "", date: new Date().toISOString().split("T")[0], client_id: "", notes: "" });
  };

  const handleSaveConfig = async () => {
    const my = parseFloat(configForm.my);
    const r = parseFloat(configForm.rent);
    if (isNaN(my) || isNaN(r) || Math.abs(my + r - 100) > 0.01) return;
    await upsertConfig.mutateAsync({ myPercentage: my, rentPercentage: r });
    setShowConfigModal(false);
  };

  const openConfigModal = () => {
    setConfigForm({ my: myPct.toString(), rent: rentPct.toString() });
    setShowConfigModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div />
        <Button onClick={() => setShowIncomeForm(true)}><Plus className="mr-2 h-4 w-4" /> Nuevo ingreso</Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <KpiCard title="Ingresos totales" value={`$${total.toLocaleString()}`} icon={DollarSign} variant="primary" />
        <KpiCard title={`Mi ganancia (${myPct}%)`} value={`$${Math.round(mine).toLocaleString()}`} icon={TrendingUp} variant="accent" />
        <KpiCard title={`Alquiler (${rentPct}%)`} value={`$${Math.round(rent).toLocaleString()}`} icon={Building2} />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Evolución mensual</CardTitle></CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? <p className="text-muted-foreground text-sm text-center py-12">Registrá ingresos para ver el gráfico</p> : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Line type="monotone" dataKey="total" name="Total" stroke="hsl(220, 25%, 10%)" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="mine" name="Mi ganancia" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="rent" name="Alquiler" stroke="hsl(200, 80%, 55%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Distribución acumulada</CardTitle>
              <Button variant="ghost" size="icon" onClick={openConfigModal} title="Editar distribución">
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {total === 0 ? <p className="text-muted-foreground text-sm text-center py-12">Sin datos</p> : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={4}>
                    {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                  </Pie>
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {monthlyData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Detalle por mes</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Bar dataKey="mine" name="Mi ganancia" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="rent" name="Alquiler" fill="hsl(200, 80%, 55%)" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Últimos ingresos</CardTitle></CardHeader>
        <CardContent>
          {incomeList.length === 0 ? <p className="text-muted-foreground text-sm text-center py-6">Sin ingresos registrados</p> : (
            <div className="space-y-2">
              {incomeList.slice(0, 20).map(i => (
                <div key={i.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">${Number(i.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground truncate">{i.date} {(i as any).clients ? `— ${(i as any).clients.name} ${(i as any).clients.last_name}` : ""}</p>
                    {i.notes && <p className="text-xs text-muted-foreground truncate">{i.notes}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => remove.mutateAsync(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New income dialog */}
      <Dialog open={showIncomeForm} onOpenChange={setShowIncomeForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo ingreso</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Monto *</Label><Input type="number" value={incomeForm.amount} onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" /></div>
              <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={incomeForm.date} onChange={e => setIncomeForm(f => ({ ...f, date: e.target.value }))} /></div>
            </div>
            <div className="space-y-1">
              <Label>Cliente (opcional)</Label>
              <Select value={incomeForm.client_id} onValueChange={v => setIncomeForm(f => ({ ...f, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Notas</Label><Textarea value={incomeForm.notes} onChange={e => setIncomeForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowIncomeForm(false)}>Cancelar</Button>
              <Button onClick={handleSaveIncome} disabled={create.isPending}>Registrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Config modal */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Distribución de ingresos</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Mi ganancia (%)</Label><Input type="number" value={configForm.my} onChange={e => setConfigForm(f => ({ ...f, my: e.target.value, rent: (100 - parseFloat(e.target.value || "0")).toString() }))} /></div>
              <div className="space-y-1"><Label>Alquiler (%)</Label><Input type="number" value={configForm.rent} onChange={e => setConfigForm(f => ({ ...f, rent: e.target.value, my: (100 - parseFloat(e.target.value || "0")).toString() }))} /></div>
            </div>
            {Math.abs(parseFloat(configForm.my || "0") + parseFloat(configForm.rent || "0") - 100) > 0.01 && (
              <p className="text-destructive text-xs">Los porcentajes deben sumar 100%</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConfigModal(false)}>Cancelar</Button>
              <Button onClick={handleSaveConfig} disabled={upsertConfig.isPending}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
