import { Bell, BellOff, BellRing, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePushSubscription } from "@/hooks/usePushSubscription";

export function PushNotificationsCard() {
  const { supported, blockedByPreview, permission, subscribed, loading, subscribe, unsubscribe, sendTest } =
    usePushSubscription();

  if (!supported) {
    return null;
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`shrink-0 rounded-lg p-2 ${subscribed ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
            {subscribed ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {subscribed ? "Notificaciones activadas" : "Notificaciones push"}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {blockedByPreview
                ? "Solo funcionan en la app publicada (no en preview). Probá en zenkaigym.lovable.app."
                : subscribed
                ? "Recibirás avisos de cumpleaños, vencimientos y cuotas pendientes."
                : permission === "denied"
                ? "Permiso bloqueado. Habilitalo en la configuración del navegador."
                : "Activá las alertas para recibir avisos en este dispositivo."}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {subscribed ? (
            <>
              <Button variant="outline" size="sm" onClick={sendTest} disabled={loading}>
                <Send className="mr-1.5 h-3.5 w-3.5" /> Prueba
              </Button>
              <Button variant="outline" size="sm" onClick={unsubscribe} disabled={loading}>
                <BellOff className="mr-1.5 h-3.5 w-3.5" /> Desactivar
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={subscribe} disabled={loading || blockedByPreview || permission === "denied"}>
              <Bell className="mr-1.5 h-3.5 w-3.5" /> Activar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}