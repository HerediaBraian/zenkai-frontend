import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { TablesInsert } from "@/integrations/supabase/types";
import { getErrorMessage } from "@/lib/getErrorMessage";

// Public VAPID key (safe to expose). Private key lives in edge function secrets.
export const VAPID_PUBLIC_KEY =
  "BGVbaQb9plgMhhHZrnXeWimYwM0_q7qNxEI2GRD6vlYIq-MJJcRro1c8_x9of4MFn-6tlera3d68kcQbDYrqWgg";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isPreviewIframe(): boolean {
  try {
    const inIframe = window.self !== window.top;
    const host = window.location.hostname;
    const isLovablePreview =
      host.includes("id-preview--") || host.includes("lovableproject.com");
    return inIframe || isLovablePreview;
  } catch {
    return true;
  }
}

export function usePushSubscription() {
  const { user } = useAuth();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [blockedByPreview, setBlockedByPreview] = useState(false);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);
    setBlockedByPreview(isPreviewIframe());
    if (ok) setPermission(Notification.permission);
  }, []);

  // Check existing subscription
  useEffect(() => {
    if (!supported || blockedByPreview || !user) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        if (!reg) return;
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      } catch (e) {
        console.warn("[push] check subscription failed", e);
      }
    })();
  }, [supported, blockedByPreview, user]);

  const subscribe = useCallback(async () => {
    if (!supported || !user) return;
    if (blockedByPreview) {
      toast.error("Las notificaciones no funcionan en el preview de Lovable. Probalo en la app publicada.");
      return;
    }

    setLoading(true);
    try {
      // 1. Register SW
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // 2. Ask permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error("Permiso denegado. Activalo desde la configuración del navegador.");
        return;
      }

      // 3. Subscribe to push
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
        });
      }

      const json = sub.toJSON();
      if (!json.keys?.p256dh || !json.keys?.auth) {
        toast.error("No se pudieron leer las claves del navegador para push.");
        return;
      }
      const row: TablesInsert<"push_subscriptions"> = {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
        last_used_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
      if (error) throw error;

      setSubscribed(true);
      toast.success("Notificaciones activadas en este dispositivo");
    } catch (e: unknown) {
      console.error("[push] subscribe error", e);
      toast.error("No se pudieron activar: " + getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [supported, blockedByPreview, user]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Notificaciones desactivadas");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user]);

  const sendTest = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-push", {
        body: {
          title: "ZENKAI",
          body: "Notificación de prueba ✅",
          url: "/",
        },
      });
      if (error) throw error;
      toast.success("Push de prueba enviada");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    supported,
    blockedByPreview,
    permission,
    subscribed,
    loading,
    subscribe,
    unsubscribe,
    sendTest,
  };
}