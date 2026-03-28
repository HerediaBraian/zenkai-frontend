import { useState, useMemo } from "react";
import { Search, Plus, Edit2, UserX, UserCheck, MessageCircle, Trash2, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClients, useMutateClient, usePredefinedMessages, useMutatePredefinedMessage, useEnrollments, useActivities, useSchedules, useMutateEnrollment } from "@/hooks/useSupabaseData";
import { toast } from "sonner";

type ClientForm = {
  name: string; last_name: string; phone: string;
  birth_date: string; notes: string; status: string; payment_status: string; enroll_date: string;
  activity_ids: string[];
};

const emptyForm: ClientForm = {
  name: "", last_name: "", phone: "",
  birth_date: "", notes: "", status: "active", payment_status: "Al día", enroll_date: new Date().toISOString().split("T")[0],
  activity_ids: [],
};

/**
 * Normaliza un número telefónico argentino para WhatsApp.
 * Entrada típica: "3541529824", "03541529824", "543541529824", etc.
 * Salida: "5493541529824" (formato que wa.me necesita para AR móvil).
 *
 * Regla AR: wa.me requiere 54 + 9 + código de área + número (sin el 15).
 */
function normalizeArgentinePhone(phone: string): string | null {
  let n = phone.replace(/[^0-9]/g, "");
  if (n.length === 0) return null;

  // Remove leading country code if present
  if (n.startsWith("549") && n.length >= 12) {
    // Already has 54+9, keep as-is
    return n;
  }
  if (n.startsWith("54") && !n.startsWith("549")) {
    // Has 54 but missing 9 → insert 9
    n = n.slice(2);
  }
  // Remove leading 0 (trunk prefix)
  if (n.startsWith("0")) n = n.slice(1);
  // Remove leading 15 after area code is not reliable here,
  // but if the number starts with 15 and is too long, strip it
  // Typical local mobile: 10 digits (area + number without 15)
  // If they typed with 15: e.g. 03541-15-529824 → after removing 0: 354115529824 (12 digits)
  // We need to detect and remove the 15
  if (n.length === 12 && /^\d{2,4}15\d+$/.test(n)) {
    // Find where "15" sits (after 2-4 digit area code)
    for (const areaLen of [2, 3, 4]) {
      if (n.substring(areaLen, areaLen + 2) === "15" && n.length - 2 === 10) {
        n = n.substring(0, areaLen) + n.substring(areaLen + 2);
        break;
      }
    }
  }

  // At this point n should be 10 digits (area code + subscriber)
  if (n.length === 10) {
    return "549" + n;
  }
  // If 11 digits and starts with 9, might already have the 9
  if (n.length === 11 && n.startsWith("9")) {
    return "54" + n;
  }
  // Fallback: prepend 549 anyway
  return "549" + n;
}

function getWhatsAppLinkData(phone: string, message?: string) {
  const cleaned = phone.replace(/[^0-9]/g, "");
  const normalized = normalizeArgentinePhone(phone);
  if (!normalized) return null;
  const base = `https://wa.me/${normalized}`;
  return {
    original: phone,
    cleaned,
    normalized,
    url: message ? `${base}?text=${encodeURIComponent(message)}` : base,
  };
}

export default function ClientsPage() {
  const { data: clients = [], isLoading } = useClients();
  const { create, update } = useMutateClient();
  const { data: predefinedMessages = [] } = usePredefinedMessages();
  const { create: createMsg, remove: removeMsg } = useMutatePredefinedMessage();
  const { data: enrollments = [] } = useEnrollments();
  const { data: activities = [] } = useActivities();
  const { data: schedules = [] } = useSchedules();
  const enrollMutation = useMutateEnrollment();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showMsgManager, setShowMsgManager] = useState(false);
  const [newMsgText, setNewMsgText] = useState("");

  const activeActivities = activities.filter(a => a.status === "active");

  // Build a map of client_id -> activity names
  const clientActivities = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const e of enrollments) {
      const actName = (e as any).activities?.name;
      if (actName) {
        if (!map[e.client_id]) map[e.client_id] = [];
        if (!map[e.client_id].includes(actName)) map[e.client_id].push(actName);
      }
    }
    return map;
  }, [enrollments]);

  // Build map of client_id -> activity_ids (unique)
  const clientActivityIds = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const e of enrollments) {
      if (!map[e.client_id]) map[e.client_id] = [];
      if (!map[e.client_id].includes(e.activity_id)) map[e.client_id].push(e.activity_id);
    }
    return map;
  }, [enrollments]);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) || c.last_name.toLowerCase().includes(q) || (c.phone || "").includes(q);
    const matchFilter = filter === "all" || c.status === filter;
    return matchSearch && matchFilter;
  });

  const openNew = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (c: any) => {
    setForm({
      name: c.name, last_name: c.last_name, phone: c.phone || "",
      birth_date: c.birth_date || "", notes: c.notes || "", status: c.status, payment_status: c.payment_status, enroll_date: c.enroll_date,
      activity_ids: clientActivityIds[c.id] || [],
    });
    setEditId(c.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const { activity_ids, ...clientData } = form;
    let clientId = editId;
    if (editId) {
      await update.mutateAsync({ id: editId, ...clientData });
    } else {
      // Create client and get the ID back
      const result = await create.mutateAsync(clientData);
      clientId = (result as any)?.id || null;
    }
    // Sync enrollments for this client
    if (clientId) {
      const currentEnrollmentActivityIds = clientActivityIds[clientId] || [];
      // Remove enrollments for activities no longer selected
      for (const actId of currentEnrollmentActivityIds) {
        if (!activity_ids.includes(actId)) {
          const toRemove = enrollments.filter(e => e.client_id === clientId && e.activity_id === actId);
          for (const e of toRemove) {
            await enrollMutation.remove.mutateAsync(e.id);
          }
        }
      }
      // Add enrollments for newly selected activities
      for (const actId of activity_ids) {
        if (!currentEnrollmentActivityIds.includes(actId)) {
          const actSchedules = schedules.filter(s => s.activity_id === actId && s.status === "active");
          for (const sched of actSchedules) {
            const alreadyEnrolled = enrollments.some(e => e.client_id === clientId && e.schedule_id === sched.id);
            if (!alreadyEnrolled) {
              await enrollMutation.create.mutateAsync({ client_id: clientId!, activity_id: actId, schedule_id: sched.id });
            }
          }
        }
      }
    }
    setShowForm(false);
  };

  const toggleStatus = async (c: any) => {
    await update.mutateAsync({ id: c.id, status: c.status === "active" ? "inactive" : "active" });
  };

  const toggleActivity = (actId: string) => {
    setForm(f => ({
      ...f,
      activity_ids: f.activity_ids.includes(actId) ? f.activity_ids.filter(id => id !== actId) : [...f.activity_ids, actId],
    }));
  };

  const handleCreateMsg = async () => {
    if (!newMsgText.trim()) return;
    await createMsg.mutateAsync({ text: newMsgText.trim() });
    setNewMsgText("");
  };

  const set = (key: keyof Omit<ClientForm, "activity_ids">, val: string) => setForm(f => ({ ...f, [key]: val }));

  const openWhatsApp = (phone: string, message?: string, stopRowClick?: () => void) => {
    stopRowClick?.();
    const linkData = getWhatsAppLinkData(phone, message);

    if (!linkData) {
      toast.error("El número no es válido para abrir WhatsApp.");
      return;
    }

    console.info("[WhatsApp Click Debug]", linkData);
    window.open(linkData.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowMsgManager(true)}>
            <MessageCircle className="mr-2 h-4 w-4" /> Mensajes
          </Button>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nuevo cliente</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Listado de clientes ({filtered.length})</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-full sm:w-[220px]" />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? <p className="text-muted-foreground text-sm">Cargando...</p> : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Actividad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Cuota</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedClient(c)}>
                        <TableCell className="font-medium">{c.name} {c.last_name}</TableCell>
                        <TableCell>
                          {c.phone ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openWhatsApp(c.phone);
                              }}
                              className="text-primary hover:underline"
                            >
                              {c.phone}
                            </button>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">{clientActivities[c.id]?.join(", ") || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell><StatusBadge status={c.status as "active" | "inactive"} /></TableCell>
                        <TableCell>
                          <span className={c.payment_status === "Al día" ? "text-success text-sm font-medium" : "text-destructive text-sm font-medium"}>{c.payment_status}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => toggleStatus(c)}>
                              {c.status === "active" ? <UserX className="h-4 w-4 text-destructive" /> : <UserCheck className="h-4 w-4 text-success" />}
                            </Button>
                            {c.phone && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="icon"><MessageCircle className="h-4 w-4" /></Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-2" align="end">
                                  <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">Enviar mensaje a {c.name}</p>
                                  {predefinedMessages.length === 0 ? (
                                    <p className="text-xs text-muted-foreground px-2 py-3">No hay mensajes. Crealos desde el botón "Mensajes".</p>
                                  ) : predefinedMessages.map(m => (
                                    <button
                                      key={m.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openWhatsApp(c.phone!, m.text);
                                      }}
                                      className="block w-full rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted truncate"
                                    >
                                      {m.text}
                                    </button>
                                  ))}
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin clientes</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {filtered.map(c => (
                  <div key={c.id} className="rounded-lg border bg-card p-4 space-y-2" onClick={() => setSelectedClient(c)}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{c.name} {c.last_name}</span>
                      <StatusBadge status={c.status as "active" | "inactive"} />
                    </div>
                    {clientActivities[c.id] && (
                      <p className="text-xs text-muted-foreground">{clientActivities[c.id].join(", ")}</p>
                    )}
                    {c.phone && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openWhatsApp(c.phone);
                        }}
                        className="block text-sm text-primary hover:underline"
                      >
                        {c.phone}
                      </button>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={c.payment_status === "Al día" ? "text-success text-xs font-medium" : "text-destructive text-xs font-medium"}>{c.payment_status}</span>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatus(c)}>
                          {c.status === "active" ? <UserX className="h-3.5 w-3.5 text-destructive" /> : <UserCheck className="h-3.5 w-3.5 text-success" />}
                        </Button>
                        {c.phone && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MessageCircle className="h-3.5 w-3.5" /></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-2" align="end">
                              {predefinedMessages.length === 0 ? (
                                <p className="text-xs text-muted-foreground px-2 py-3">No hay mensajes predefinidos.</p>
                              ) : predefinedMessages.map(m => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openWhatsApp(c.phone!, m.text);
                                  }}
                                  className="block w-full rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted truncate"
                                >
                                  {m.text}
                                </button>
                              ))}
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Sin clientes</p>}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selectedClient?.name} {selectedClient?.last_name}</DialogTitle></DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground text-xs">Teléfono</Label>
                  {selectedClient.phone ? (
                    <button
                      type="button"
                      onClick={() => openWhatsApp(selectedClient.phone)}
                      className="block text-sm font-medium text-primary hover:underline"
                    >
                      {selectedClient.phone}
                    </button>
                  ) : <p className="text-sm font-medium">—</p>}
                </div>
                <div><Label className="text-muted-foreground text-xs">Actividad</Label><p className="text-sm font-medium">{clientActivities[selectedClient.id]?.join(", ") || "—"}</p></div>
                <div><Label className="text-muted-foreground text-xs">Nacimiento</Label><p className="text-sm font-medium">{selectedClient.birth_date || "—"}</p></div>
                <div><Label className="text-muted-foreground text-xs">Inscripción</Label><p className="text-sm font-medium">{selectedClient.enroll_date}</p></div>
                <div><Label className="text-muted-foreground text-xs">Estado</Label><div className="mt-1"><StatusBadge status={selectedClient.status} /></div></div>
                <div><Label className="text-muted-foreground text-xs">Cuota</Label><p className={`text-sm font-medium ${selectedClient.payment_status === "Al día" ? "text-success" : "text-destructive"}`}>{selectedClient.payment_status}</p></div>
              </div>
              {selectedClient.notes && <div><Label className="text-muted-foreground text-xs">Observaciones</Label><p className="text-sm">{selectedClient.notes}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Editar cliente" : "Nuevo cliente"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Nombre *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
              <div className="space-y-1"><Label>Apellido</Label><Input value={form.last_name} onChange={e => set("last_name", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Teléfono</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="3541529824" /></div>
              <div className="space-y-1"><Label>Nacimiento</Label><Input type="date" value={form.birth_date} onChange={e => set("birth_date", e.target.value)} /></div>
            </div>
            <div className="space-y-1">
              <Label>Actividades</Label>
              {activeActivities.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay actividades disponibles. Creá una en la sección Actividades.</p>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal">
                      <span className="truncate">
                        {form.activity_ids.length === 0
                          ? "Seleccionar actividades"
                          : `${form.activity_ids.length} actividad${form.activity_ids.length > 1 ? "es" : ""} seleccionada${form.activity_ids.length > 1 ? "s" : ""}`}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-2 max-h-60 overflow-y-auto" align="start">
                    {activeActivities.map(a => (
                      <label key={a.id} className="flex items-center gap-2 cursor-pointer text-sm rounded-md px-2 py-2 hover:bg-muted/50 transition-colors">
                        <Checkbox checked={form.activity_ids.includes(a.id)} onCheckedChange={() => toggleActivity(a.id)} />
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                        {a.name}
                      </label>
                    ))}
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Inscripción</Label><Input type="date" value={form.enroll_date} onChange={e => set("enroll_date", e.target.value)} /></div>
              <div className="space-y-1">
                <Label>Cuota</Label>
                <Select value={form.payment_status} onValueChange={v => set("payment_status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Al día">Al día</SelectItem><SelectItem value="Debe">Debe</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Activo</SelectItem><SelectItem value="inactive">Inactivo</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Observaciones</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={create.isPending || update.isPending}>{editId ? "Guardar" : "Crear"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Predefined Messages Manager */}
      <Dialog open={showMsgManager} onOpenChange={setShowMsgManager}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Mensajes predeterminados</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input value={newMsgText} onChange={e => setNewMsgText(e.target.value)} placeholder="Escribí un mensaje..." className="flex-1" onKeyDown={e => e.key === "Enter" && handleCreateMsg()} />
              <Button onClick={handleCreateMsg} disabled={createMsg.isPending} size="sm">Agregar</Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {predefinedMessages.map(m => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                  <span className="text-sm truncate flex-1 mr-2">{m.text}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeMsg.mutateAsync(m.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              ))}
              {predefinedMessages.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No hay mensajes. Agregá el primero.</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
