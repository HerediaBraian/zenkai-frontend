import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OccupancyBar } from "@/components/molecules/OccupancyBar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Edit2, Power } from "lucide-react";
import { useActivities, useEnrollments, useMutateActivity } from "@/hooks/useSupabaseData";

const colors = [
  "hsl(160, 84%, 39%)", "hsl(200, 80%, 55%)", "hsl(35, 92%, 60%)",
  "hsl(280, 60%, 55%)", "hsl(340, 75%, 55%)", "hsl(10, 80%, 55%)",
];

function softBg(hslStr: string) {
  const match = hslStr.match(/hsl\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  if (!match) return "hsl(0, 0%, 97%)";
  return `hsl(${match[1]}, ${match[2].replace(/%/, "")}%, 95%)`;
}

type Form = { name: string; description: string; color: string; max_capacity: number; instructor: string; status: string };
const emptyForm: Form = { name: "", description: "", color: colors[0], max_capacity: 20, instructor: "", status: "active" };

export default function ActivitiesPage() {
  const { data: activities = [], isLoading } = useActivities();
  const { data: enrollments = [] } = useEnrollments();
  const { create, update } = useMutateActivity();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);

  const uniqueClientsCount = (actId: string) => {
    const uniqueClients = new Set(enrollments.filter(e => e.activity_id === actId).map(e => e.client_id));
    return uniqueClients.size;
  };

  const openNew = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (a: any) => {
    setForm({ name: a.name, description: a.description || "", color: a.color, max_capacity: a.max_capacity, instructor: a.instructor || "", status: a.status });
    setEditId(a.id); setShowForm(true);
  };
  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editId) await update.mutateAsync({ id: editId, ...form });
    else await create.mutateAsync(form);
    setShowForm(false);
  };
  const toggleStatus = async (a: any) => {
    await update.mutateAsync({ id: a.id, status: a.status === "active" ? "inactive" : "active" });
  };

  const set = (k: keyof Form, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nueva actividad</Button>
      </div>

      {isLoading ? <p className="text-muted-foreground">Cargando...</p> : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map(a => {
            const enrolled = uniqueClientsCount(a.id);
            return (
              <Card key={a.id} className={`overflow-hidden ${a.status === "inactive" ? "opacity-60" : ""}`} style={{ backgroundColor: softBg(a.color) }}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{a.name}</CardTitle>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />{enrolled}/{a.max_capacity}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.description}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <OccupancyBar current={enrolled} max={a.max_capacity} label="Ocupación" />
                  {a.instructor && <p className="text-xs text-muted-foreground">Instructor: {a.instructor}</p>}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Edit2 className="h-3.5 w-3.5 mr-1" />Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleStatus(a)}><Power className="h-3.5 w-3.5 mr-1" />{a.status === "active" ? "Desactivar" : "Activar"}</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {activities.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No hay actividades. Creá la primera.</p>}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar actividad" : "Nueva actividad"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label>Nombre *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
            <div className="space-y-1"><Label>Descripción</Label><Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Cupo máximo</Label><Input type="number" value={form.max_capacity} onChange={e => set("max_capacity", parseInt(e.target.value) || 0)} /></div>
              <div className="space-y-1"><Label>Instructor</Label><Input value={form.instructor} onChange={e => set("instructor", e.target.value)} /></div>
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <div className="flex gap-2">{colors.map(c => (
                <button key={c} onClick={() => set("color", c)} className={`h-8 w-8 rounded-full border-2 ${form.color === c ? "border-foreground" : "border-transparent"}`} style={{ backgroundColor: c }} />
              ))}</div>
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
