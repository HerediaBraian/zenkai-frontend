import { useMemo } from "react";
import { Users, Dumbbell, UserCheck, UserX, DollarSign, TrendingUp, Building2, AlertTriangle, Info } from "lucide-react";
import { KpiCard } from "@/components/molecules/KpiCard";
import { OccupancyBar } from "@/components/molecules/OccupancyBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClients, useActivities, useSchedules, useEnrollments, useIncome, useFinancialConfig } from "@/hooks/useSupabaseData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const dayNames: Record<number, string> = { 0: "Domingo", 1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes", 6: "Sábado" };

function softBg(hslStr: string) {
  const match = hslStr.match(/hsl\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  if (!match) return "hsl(0, 0%, 97%)";
  return `hsl(${match[1]}, ${match[2].replace(/%/, "")}%, 95%)`;
}

export default function DashboardHome() {
  const { data: clients = [] } = useClients();
  const { data: activities = [] } = useActivities();
  const { data: schedules = [] } = useSchedules();
  const { data: enrollments = [] } = useEnrollments();
  const { data: incomeList = [] } = useIncome();
  const { data: config } = useFinancialConfig();

  const myPct = config?.my_percentage ?? 70;
  const rentPct = config?.rent_percentage ?? 30;

  const activeClients = clients.filter(c => c.status === "active").length;
  const activeActivities = activities.filter(a => a.status === "active").length;

  const today = dayNames[new Date().getDay()];
  const activeActivityIds = new Set(activities.filter(a => a.status === "active").map(a => a.id));
  const todaySchedules = schedules.filter(s => s.day_of_week === today && s.status === "active" && activeActivityIds.has(s.activity_id));

  const todayOccupied = todaySchedules.reduce((s, sch) => s + enrollments.filter(e => e.schedule_id === sch.id).length, 0);
  const todayMax = todaySchedules.reduce((s, sch) => {
    const act = (sch as any).activities;
    return s + (act?.max_capacity || 20);
  }, 0);

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthIncome = incomeList.filter(i => i.date.startsWith(currentMonthStr)).reduce((s, i) => s + Number(i.amount), 0);
  const monthMine = monthIncome * myPct / 100;
  const monthRent = monthIncome * rentPct / 100;

  const pieData = [
    { name: `Mi ganancia (${myPct}%)`, value: monthMine || 1 },
    { name: `Alquiler (${rentPct}%)`, value: monthRent || 1 },
  ];
  const pieColors = ["hsl(160, 84%, 39%)", "hsl(200, 80%, 55%)"];

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    incomeList.forEach(i => { const m = i.date.slice(0, 7); map[m] = (map[m] || 0) + Number(i.amount); });
    return Object.entries(map).sort().slice(-6).map(([m, t]) => ({
      month: m.slice(5) + "/" + m.slice(2, 4),
      mine: t * myPct / 100,
      rent: t * rentPct / 100,
    }));
  }, [incomeList, myPct, rentPct]);

  const todayClasses = todaySchedules.map(s => {
    const act = (s as any).activities;
    const enrolled = enrollments.filter(e => e.schedule_id === s.id).length;
    const cap = act?.max_capacity || 20;
    return { time: s.start_time.slice(0, 5), activity: act?.name || "—", occupied: enrolled, max: cap, color: act?.color || "hsl(160, 84%, 39%)" };
  }).sort((a, b) => a.time.localeCompare(b.time));

  const upcomingStudents = useMemo(() => {
    const result: { name: string; activity: string; time: string }[] = [];
    for (const sched of todaySchedules) {
      const schEnr = enrollments.filter(e => e.schedule_id === sched.id);
      const act = (sched as any).activities;
      for (const e of schEnr) {
        const c = (e as any).clients;
        result.push({ name: c ? `${c.name} ${c.last_name}` : "—", activity: act?.name || "—", time: sched.start_time.slice(0, 5) });
      }
    }
    return result.sort((a, b) => a.time.localeCompare(b.time)).slice(0, 8);
  }, [todaySchedules, enrollments]);

  const alerts = useMemo(() => {
    const a: { type: "warning" | "info"; message: string }[] = [];
    clients.filter(c => c.status === "active" && c.payment_status === "Debe").forEach(c => a.push({ type: "warning", message: `${c.name} ${c.last_name} tiene cuota pendiente` }));
    todayClasses.filter(c => c.occupied >= c.max).forEach(c => a.push({ type: "info", message: `${c.activity} ${c.time} está completa` }));
    activities.filter(act => {
      const uniqueClients = new Set(enrollments.filter(e => e.activity_id === act.id).map(e => e.client_id));
      const total = uniqueClients.size;
      return act.status === "active" && total >= act.max_capacity * 0.9 && total < act.max_capacity;
    }).forEach(act => a.push({ type: "info", message: `${act.name} tiene pocos cupos disponibles` }));
    return a.slice(0, 5);
  }, [clients, todayClasses, activities, enrollments]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Clientes activos" value={activeClients} icon={Users} variant="primary" />
        <KpiCard title="Actividades" value={activeActivities} icon={Dumbbell} variant="accent" />
        <KpiCard title="Cupos ocupados hoy" value={todayOccupied} subtitle={`de ${todayMax} disponibles`} icon={UserCheck} variant="primary" />
        <KpiCard title="Cupos disponibles hoy" value={todayMax - todayOccupied} icon={UserX} />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <KpiCard title="Ingresos del mes" value={`$${Math.round(monthIncome).toLocaleString()}`} icon={DollarSign} variant="primary" />
        <KpiCard title={`Mi ganancia (${myPct}%)`} value={`$${Math.round(monthMine).toLocaleString()}`} icon={TrendingUp} variant="accent" />
        <KpiCard title={`Alquiler (${rentPct}%)`} value={`$${Math.round(monthRent).toLocaleString()}`} icon={Building2} />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Ingresos mensuales</CardTitle></CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? <p className="text-muted-foreground text-sm text-center py-12">Registrá ingresos para ver el gráfico</p> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Bar dataKey="mine" name="Mi ganancia" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rent" name="Alquiler" fill="hsl(200, 80%, 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Distribución de ingresos</CardTitle></CardHeader>
          <CardContent>
            {monthIncome === 0 ? <p className="text-muted-foreground text-sm text-center py-12">Sin ingresos este mes</p> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={4}>
                    {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                  </Pie>
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => `$${Math.round(v).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Clases de hoy</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {todayClasses.length === 0 ? <p className="text-sm text-muted-foreground">Sin clases hoy</p> : todayClasses.map((c, i) => (
              <div key={i} className="rounded-lg p-3 space-y-2" style={{ backgroundColor: softBg(c.color) }}>
                <div className="flex items-center justify-between"><span className="text-sm font-medium">{c.time} — {c.activity}</span></div>
                <OccupancyBar current={c.occupied} max={c.max} label="Ocupación" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Próximos alumnos</CardTitle></CardHeader>
          <CardContent>
            {upcomingStudents.length === 0 ? <p className="text-sm text-muted-foreground">Sin alumnos inscriptos hoy</p> : (
              <div className="space-y-3">
                {upcomingStudents.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                    <div><p className="text-sm font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.activity}</p></div>
                    <span className="text-xs font-medium text-muted-foreground">{s.time}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Alertas</CardTitle></CardHeader>
          <CardContent>
            {alerts.length === 0 ? <p className="text-sm text-muted-foreground">Sin alertas</p> : (
              <div className="space-y-3">
                {alerts.map((a, i) => (
                  <div key={i} className={`flex items-start gap-3 rounded-lg px-3 py-2 ${a.type === "warning" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"}`}>
                    {a.type === "warning" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Info className="mt-0.5 h-4 w-4 shrink-0" />}
                    <p className="text-sm">{a.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
