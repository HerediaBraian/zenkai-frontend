import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OccupancyBar } from "@/components/molecules/OccupancyBar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useSchedules, useActivities, useEnrollments, useMutateSchedule } from "@/hooks/useSupabaseData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function softBg(hslStr: string) {
  const match = hslStr.match(/hsl\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  if (!match) return "hsl(0, 0%, 97%)";
  return `hsl(${match[1]}, ${match[2].replace(/%/, "")}%, 95%)`;
}

type Form = { activity_id: string; days: string[]; start_time: string; status: string };
const emptyForm: Form = { activity_id: "", days: ["Lunes"], start_time: "09:00", status: "active" };

export default function SchedulePage() {
  const { data: schedules = [], isLoading } = useSchedules();
  const { data: activities = [] } = useActivities();
  const { data: enrollments = [] } = useEnrollments();
  const { create, update, remove } = useMutateSchedule();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);

  const activeActivityIds = new Set(activities.filter(a => a.status === "active").map(a => a.id));

  const enrolledCount = (schedId: string) => enrollments.filter(e => e.schedule_id === schedId).length;

  const openNew = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (s: any) => {
    setForm({ activity_id: s.activity_id, days: [s.day_of_week], start_time: s.start_time.slice(0, 5), status: s.status });
    setEditId(s.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.activity_id || form.days.length === 0) return;
    if (editId) {
      await update.mutateAsync({ id: editId, activity_id: form.activity_id, day_of_week: form.days[0], start_time: form.start_time, duration_minutes: 60, status: form.status });
    } else {
      for (const day of form.days) {
        await create.mutateAsync({ activity_id: form.activity_id, day_of_week: day, start_time: form.start_time, duration_minutes: 60, status: form.status, max_capacity: null });
      }
    }
    setShowForm(false);
  };

  const handleDelete = async (id: string) => { await remove.mutateAsync(id); };

  const toggleDay = (day: string) => {
    setForm(f => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day],
    }));
  };

  // Only show schedules for active activities
  const visibleSchedules = schedules.filter(s => activeActivityIds.has(s.activity_id));

  // Occupancy chart data
  const occupancyData = useMemo(() => {
    return activities.filter(a => a.status === "active").map(a => {
      const uniqueClients = new Set(enrollments.filter(e => e.activity_id === a.id).map(e => e.client_id));
      const totalEnrolled = uniqueClients.size;
      const pct = a.max_capacity > 0 ? Math.round((totalEnrolled / a.max_capacity) * 100) : 0;
      return { name: a.name, enrolled: totalEnrolled, capacity: a.max_capacity, pct, color: a.color };
    }).sort((a, b) => b.pct - a.pct);
  }, [activities, enrollments]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nuevo horario</Button>
      </div>

      {isLoading ? <p className="text-muted-foreground">Cargando...</p> : (
        <>
          {/* Weekday grid */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            {days.slice(0, 5).map(day => {
              const daySchedules = visibleSchedules.filter(s => s.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
              return (
                <Card key={day}>
                  <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{day}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {daySchedules.length === 0 ? <p className="text-sm text-muted-foreground">Sin clases</p> : daySchedules.map(s => {
                      const act = (s as any).activities;
                      const cap = act?.max_capacity || 20;
                      const enrolled = enrolledCount(s.id);
                      const color = act?.color || "hsl(160, 84%, 39%)";
                      return (
                        <div key={s.id} className="rounded-lg p-3" style={{ backgroundColor: softBg(color) }}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">{act?.name || "—"}</span>
                            <div className="flex gap-0.5">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(s)}><Edit2 className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                          <p className="text-xs font-medium text-muted-foreground mt-0.5">{s.start_time.slice(0, 5)}</p>
                          <div className="mt-2"><OccupancyBar current={enrolled} max={cap} /></div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Weekend */}
          {visibleSchedules.some(s => s.day_of_week === "Sábado" || s.day_of_week === "Domingo") && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              {["Sábado", "Domingo"].map(day => {
                const daySchedules = visibleSchedules.filter(s => s.day_of_week === day);
                if (daySchedules.length === 0) return null;
                return (
                  <Card key={day}>
                    <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{day}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {daySchedules.map(s => {
                        const act = (s as any).activities;
                        const cap = act?.max_capacity || 20;
                        const color = act?.color || "hsl(160, 84%, 39%)";
                        return (
                          <div key={s.id} className="rounded-lg p-3" style={{ backgroundColor: softBg(color) }}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold">{act?.name}</span>
                              <div className="flex gap-0.5">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(s)}><Edit2 className="h-3 w-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">{s.start_time.slice(0, 5)}</p>
                            <div className="mt-2"><OccupancyBar current={enrolledCount(s.id)} max={cap} /></div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Occupancy chart */}
          {occupancyData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Ocupación por actividad</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(200, occupancyData.length * 50)}>
                  <BarChart data={occupancyData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                    <Tooltip formatter={(v: number, name: string, props: any) => [`${v}% (${props.payload.enrolled}/${props.payload.capacity})`, "Ocupación"]} />
                    <Bar dataKey="pct" name="Ocupación" radius={[0, 4, 4, 0]}>
                      {occupancyData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar horario" : "Nuevo horario"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Actividad *</Label>
              <Select value={form.activity_id} onValueChange={v => setForm(f => ({ ...f, activity_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{activities.filter(a => a.status === "active").map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{editId ? "Día" : "Días *"}</Label>
              {editId ? (
                <Select value={form.days[0] || "Lunes"} onValueChange={v => setForm(f => ({ ...f, days: [v] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {days.map(d => (
                    <label key={d} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox checked={form.days.includes(d)} onCheckedChange={() => toggleDay(d)} />
                      {d}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Hora</Label>
              <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={create.isPending || update.isPending}>{editId ? "Guardar" : "Crear"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
