import { useState, useMemo, useEffect } from "react";
import { Search, Send, CheckCircle2, XCircle, Clock, History, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBulkMessageLogs, useCreateBulkMessageLog } from "@/hooks/useBulkMessages";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Status = "pending" | "sent" | "failed";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  messageText: string;
  clients: Array<{ id: string; name: string; last_name: string; phone: string | null }>;
  buildWhatsAppUrl: (phone: string, message: string) => string | null;
};

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 2000;

export function BulkMessageDialog({ open, onOpenChange, messageText, clients, buildWhatsAppUrl }: Props) {
  const validClients = useMemo(
    () => clients.filter(c => c.phone && c.phone.trim().length > 0),
    [clients]
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentOnce, setSentOnce] = useState(false);

  const { data: logs = [] } = useBulkMessageLogs();
  const createLog = useCreateBulkMessageLog();

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelected(new Set(validClients.map(c => c.id)));
      setStatuses({});
      setSearch("");
      setConfirming(false);
      setSentOnce(false);
    }
  }, [open, validClients]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return validClients;
    return validClients.filter(c =>
      `${c.name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.phone || "").includes(q)
    );
  }, [validClients, search]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleAllVisible = () => {
    const visibleIds = filtered.map(c => c.id);
    const allSelected = visibleIds.every(id => selected.has(id));
    setSelected(prev => {
      const n = new Set(prev);
      if (allSelected) visibleIds.forEach(id => n.delete(id));
      else visibleIds.forEach(id => n.add(id));
      return n;
    });
  };

  const handleSend = async () => {
    const targets = validClients.filter(c => selected.has(c.id));
    if (targets.length === 0) {
      toast.error("Seleccioná al menos un cliente");
      return;
    }

    setSending(true);
    setConfirming(false);

    // Initialize all as pending
    const initial: Record<string, Status> = {};
    targets.forEach(c => { initial[c.id] = "pending"; });
    setStatuses(initial);

    const sentIds: string[] = [];
    const failedIds: string[] = [];

    // Send in batches
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      for (const c of batch) {
        const url = buildWhatsAppUrl(c.phone!, messageText);
        if (!url) {
          failedIds.push(c.id);
          setStatuses(prev => ({ ...prev, [c.id]: "failed" }));
          continue;
        }
        const win = window.open(url, "_blank", "noopener,noreferrer");
        if (!win) {
          failedIds.push(c.id);
          setStatuses(prev => ({ ...prev, [c.id]: "failed" }));
        } else {
          sentIds.push(c.id);
          setStatuses(prev => ({ ...prev, [c.id]: "sent" }));
        }
      }
      // Wait between batches (not after the last one)
      if (i + BATCH_SIZE < targets.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    // Save log
    await createLog.mutateAsync({
      message_text: messageText,
      total_recipients: targets.length,
      sent_count: sentIds.length,
      failed_count: failedIds.length,
      recipient_ids: targets.map(t => t.id),
      sent_ids: sentIds,
      failed_ids: failedIds,
    });

    if (failedIds.length > 0) {
      toast.warning(`Se abrieron ${sentIds.length} de ${targets.length}. Algunos fueron bloqueados por el navegador (permití popups).`);
    } else {
      toast.success(`Se abrieron ${sentIds.length} ventanas de WhatsApp.`);
    }

    setSending(false);
    setSentOnce(true);
  };

  const markStatus = (id: string, status: Status) => {
    setStatuses(prev => ({ ...prev, [id]: status }));
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Envío masivo de WhatsApp</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="send" className="flex-1 flex flex-col overflow-hidden">
          <TabsList>
            <TabsTrigger value="send">Enviar</TabsTrigger>
            <TabsTrigger value="history"><History className="mr-1.5 h-3.5 w-3.5" /> Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="flex-1 overflow-hidden flex flex-col space-y-3 mt-3">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Mensaje a enviar:</p>
              <p className="text-sm whitespace-pre-wrap">{messageText}</p>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 dark:text-amber-200">
                Se abrirá una pestaña de WhatsApp por cada cliente seleccionado, en lotes de {BATCH_SIZE} cada {BATCH_DELAY_MS / 1000}s.
                Permití popups para este sitio si el navegador los bloquea.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={toggleAllVisible}>
                {allVisibleSelected ? "Desmarcar visibles" : "Marcar visibles"}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              {selected.size} de {validClients.length} seleccionados
              {validClients.length < clients.length && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">
                  ({clients.length - validClients.length} sin teléfono, excluidos)
                </span>
              )}
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <div className="divide-y">
                {filtered.map(c => {
                  const status = statuses[c.id];
                  return (
                    <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={selected.has(c.id)}
                        onCheckedChange={() => toggle(c.id)}
                        disabled={sending}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name} {c.last_name}</p>
                        <p className="text-xs text-muted-foreground">{c.phone}</p>
                      </div>
                      {status === "pending" && (
                        <span className="text-xs flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" /> Pendiente
                        </span>
                      )}
                      {status === "sent" && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs flex items-center gap-1 text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Enviado
                          </span>
                          {sentOnce && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => { e.preventDefault(); markStatus(c.id, "failed"); }}
                            >
                              Marcar fallido
                            </Button>
                          )}
                        </div>
                      )}
                      {status === "failed" && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs flex items-center gap-1 text-destructive">
                            <XCircle className="h-3.5 w-3.5" /> Fallido
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.preventDefault();
                              const url = buildWhatsAppUrl(c.phone!, messageText);
                              if (url) {
                                const w = window.open(url, "_blank", "noopener,noreferrer");
                                if (w) markStatus(c.id, "sent");
                              }
                            }}
                          >
                            Reintentar
                          </Button>
                        </div>
                      )}
                    </label>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">Sin clientes</p>
                )}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
                {sentOnce ? "Cerrar" : "Cancelar"}
              </Button>
              {!sentOnce && (
                <Button onClick={() => setConfirming(true)} disabled={sending || selected.size === 0}>
                  <Send className="mr-2 h-4 w-4" />
                  {sending ? "Enviando..." : `Enviar a ${selected.size}`}
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-hidden mt-3">
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {logs.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">Sin envíos registrados</p>
                )}
                {logs.map((log: Tables<"bulk_message_logs">) => (
                  <div key={log.id} className="rounded-lg border bg-card p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("es-AR")}
                      </span>
                      <div className="flex gap-2 text-xs">
                        <span className="text-success">{log.sent_count} enviados</span>
                        {log.failed_count > 0 && (
                          <span className="text-destructive">{log.failed_count} fallidos</span>
                        )}
                        <span className="text-muted-foreground">de {log.total_recipients}</span>
                      </div>
                    </div>
                    <p className="text-sm line-clamp-2">{log.message_text}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Confirmation */}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>¿Enviar este mensaje a {selected.size} clientes?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-sm whitespace-pre-wrap">{messageText}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Se abrirán {selected.size} pestañas de WhatsApp en lotes. Tendrás que apretar enviar en cada una.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(false)}>Cancelar</Button>
              <Button onClick={handleSend}>Confirmar y abrir</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}