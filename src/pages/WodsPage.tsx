import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Trophy, FileText, BarChart3 } from "lucide-react";
import { useWods, useWodResults, useMutateWods, useMutateWodResults } from "@/hooks/useWods";
import { useClients } from "@/hooks/useSupabaseData";
import type { Tables } from "@/integrations/supabase/types";
import type { WodResultWithRelations } from "@/types/db";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function WodsPage() {
  const { data: wods = [] } = useWods();
  const { data: results = [] } = useWodResults();
  const { data: clients = [] } = useClients();
  const wodMut = useMutateWods();
  const resultMut = useMutateWodResults();

  // Library dialog
  const [showWodForm, setShowWodForm] = useState(false);
  const [editingWod, setEditingWod] = useState<Tables<"wods"> | null>(null);
  const [wodForm, setWodForm] = useState({ name: "", description: "" });

  // Result dialog
  const [showResultForm, setShowResultForm] = useState(false);
  const [resultForm, setResultForm] = useState({
    wod_id: "",
    client_id: "",
    date: new Date().toISOString().split("T")[0],
    result_value: "",
    result_text: "",
    notes: "",
  });

  // Progress tab
  const [progressClient, setProgressClient] = useState<string>("");
  const [progressWod, setProgressWod] = useState<string>("");

  const openNewWod = () => {
    setEditingWod(null);
    setWodForm({ name: "", description: "" });
    setShowWodForm(true);
  };
  const openEditWod = (w: Tables<"wods">) => {
    setEditingWod(w);
    setWodForm({ name: w.name, description: w.description || "" });
    setShowWodForm(true);
  };
  const handleSaveWod = async () => {
    if (!wodForm.name.trim()) return;
    if (editingWod) {
      await wodMut.update.mutateAsync({ id: editingWod.id, ...wodForm });
    } else {
      await wodMut.create.mutateAsync(wodForm);
    }
    setShowWodForm(false);
  };

  const openNewResult = (wodId?: string) => {
    setResultForm({
      wod_id: wodId || "",
      client_id: "",
      date: new Date().toISOString().split("T")[0],
      result_value: "",
      result_text: "",
      notes: "",
    });
    setShowResultForm(true);
  };
  const handleSaveResult = async () => {
    if (!resultForm.wod_id || !resultForm.client_id || !resultForm.result_text.trim()) return;
    await resultMut.create.mutateAsync({
      wod_id: resultForm.wod_id,
      client_id: resultForm.client_id,
      date: resultForm.date,
      result_value: resultForm.result_value ? parseFloat(resultForm.result_value) : null,
      result_text: resultForm.result_text,
      notes: resultForm.notes,
    });
    setShowResultForm(false);
  };

  // Progress data
  const progressResults = useMemo(() => {
    if (!progressClient || !progressWod) return [];
    const list = results as WodResultWithRelations[];
    return list
      .filter((r) => r.client_id === progressClient && r.wod_id === progressWod)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [results, progressClient, progressWod]);

  const prValue = useMemo(() => {
    const vals = progressResults.map((r) => r.result_value).filter((v): v is number => v != null);
    return vals.length ? Math.max(...vals) : null;
  }, [progressResults]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="library" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="library"><FileText className="h-4 w-4 mr-1.5" />Biblioteca</TabsTrigger>
          <TabsTrigger value="results"><Trophy className="h-4 w-4 mr-1.5" />Registros</TabsTrigger>
          <TabsTrigger value="progress"><BarChart3 className="h-4 w-4 mr-1.5" />Progreso</TabsTrigger>
        </TabsList>

        {/* Library */}
        <TabsContent value="library" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Button onClick={openNewWod}><Plus className="mr-2 h-4 w-4" /> Nuevo WOD</Button>
          </div>
          {wods.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Aún no hay WODs. Creá el primero.</CardContent></Card>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {wods.map((w) => {
                const list = results as WodResultWithRelations[];
                const count = list.filter((r) => r.wod_id === w.id).length;
                return (
                  <Card key={w.id} className="group">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-tight">{w.name}</CardTitle>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditWod(w)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => wodMut.remove.mutateAsync(w.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {w.description && <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{w.description}</p>}
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{count} {count === 1 ? "registro" : "registros"}</Badge>
                        <Button variant="outline" size="sm" onClick={() => openNewResult(w.id)}><Plus className="h-3.5 w-3.5 mr-1" />Resultado</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Results */}
        <TabsContent value="results" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Button onClick={() => openNewResult()} disabled={wods.length === 0}><Plus className="mr-2 h-4 w-4" /> Registrar resultado</Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              {results.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">Sin registros aún</p>
              ) : (
                <div className="space-y-2">
                  {(results as WodResultWithRelations[]).map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{r.wods?.name}</p>
                          <Badge variant="outline" className="text-xs">{r.clients?.name} {r.clients?.last_name}</Badge>
                        </div>
                        <p className="text-sm mt-1">{r.result_text}{r.result_value != null && <span className="text-muted-foreground"> · valor: {r.result_value}</span>}</p>
                        <p className="text-xs text-muted-foreground">{r.date}{r.notes && ` — ${r.notes}`}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => resultMut.remove.mutateAsync(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress */}
        <TabsContent value="progress" className="space-y-4 mt-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Comparar evolución</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Cliente</Label>
                  <Select value={progressClient} onValueChange={setProgressClient}>
                    <SelectTrigger><SelectValue placeholder="Elegí un cliente" /></SelectTrigger>
                    <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} {c.last_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>WOD</Label>
                  <Select value={progressWod} onValueChange={setProgressWod}>
                    <SelectTrigger><SelectValue placeholder="Elegí un WOD" /></SelectTrigger>
                    <SelectContent>{wods.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {!progressClient || !progressWod ? (
                <p className="text-muted-foreground text-sm text-center py-8">Seleccioná cliente y WOD para ver la evolución</p>
              ) : progressResults.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Sin registros para esta combinación</p>
              ) : (
                <>
                  {prValue != null && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Mejor marca (PR): {prValue}</span>
                    </div>
                  )}

                  {progressResults.some((r) => r.result_value != null) && (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart
                        data={progressResults
                          .filter((r) => r.result_value != null)
                          .map((r) => ({ date: r.date.slice(5), value: r.result_value as number }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}

                  <div className="space-y-2">
                    {progressResults.map((r, idx: number) => {
                      const prev = progressResults[idx - 1];
                      const diff = prev && r.result_value != null && prev.result_value != null ? r.result_value - prev.result_value : null;
                      const isPR = r.result_value != null && r.result_value === prValue;
                      return (
                        <div key={r.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-2">
                          <div>
                            <p className="text-sm font-medium">{r.result_text}{r.result_value != null && ` (${r.result_value})`}</p>
                            <p className="text-xs text-muted-foreground">{r.date}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {diff != null && diff !== 0 && (
                              <Badge variant={diff > 0 ? "default" : "secondary"} className="text-xs">
                                {diff > 0 ? "+" : ""}{diff}
                              </Badge>
                            )}
                            {isPR && <Badge className="text-xs"><Trophy className="h-3 w-3 mr-1" />PR</Badge>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* WOD form */}
      <Dialog open={showWodForm} onOpenChange={setShowWodForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingWod ? "Editar WOD" : "Nuevo WOD"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={wodForm.name} onChange={e => setWodForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Fran, Murph, AMRAP 20'..." />
            </div>
            <div className="space-y-1">
              <Label>Descripción / movimientos</Label>
              <Textarea value={wodForm.description} onChange={e => setWodForm(f => ({ ...f, description: e.target.value }))} rows={5} placeholder="21-15-9 thrusters + pull ups" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowWodForm(false)}>Cancelar</Button>
              <Button onClick={handleSaveWod} disabled={wodMut.create.isPending || wodMut.update.isPending}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Result form */}
      <Dialog open={showResultForm} onOpenChange={setShowResultForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar resultado</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>WOD *</Label>
                <Select value={resultForm.wod_id} onValueChange={v => setResultForm(f => ({ ...f, wod_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{wods.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Cliente *</Label>
                <Select value={resultForm.client_id} onValueChange={v => setResultForm(f => ({ ...f, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} {c.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Fecha</Label>
              <Input type="date" value={resultForm.date} onChange={e => setResultForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Resultado *</Label>
              <Input value={resultForm.result_text} onChange={e => setResultForm(f => ({ ...f, result_text: e.target.value }))} placeholder="Ej: 5 vueltas + 12 reps · 8:42 · 80kg x 5" />
            </div>
            <div className="space-y-1">
              <Label>Valor numérico (opcional, para gráfico)</Label>
              <Input type="number" step="0.01" value={resultForm.result_value} onChange={e => setResultForm(f => ({ ...f, result_value: e.target.value }))} placeholder="Ej: 5, 522 (segundos), 80" />
              <p className="text-xs text-muted-foreground">Usá este número para comparar progreso (rondas, segundos, kg).</p>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea value={resultForm.notes} onChange={e => setResultForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowResultForm(false)}>Cancelar</Button>
              <Button onClick={handleSaveResult} disabled={resultMut.create.isPending}>Registrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
