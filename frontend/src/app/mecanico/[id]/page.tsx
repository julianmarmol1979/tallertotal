"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Bell, BellOff, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TallerTotalLogo } from "@/components/TallerTotalLogo";

type MechanicPublic = {
  id: string;
  name: string;
  specialty?: string;
  hasPushSubscription: boolean;
};

type Status = "idle" | "loading" | "subscribed" | "denied" | "unsupported" | "error";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function registerAndSubscribe(vapidKey: string): Promise<PushSubscription> {
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  // Always unsubscribe first so the new subscription uses the current VAPID key.
  // Reusing an old subscription silently fails if the key changed.
  const existing = await reg.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();

  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
  });
}

export default function MecanicoPage() {
  const { id } = useParams<{ id: string }>();
  const [mechanic, setMechanic] = useState<MechanicPublic | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [loadingMechanic, setLoadingMechanic] = useState(true);

  useEffect(() => {
    fetch(`/api/public/mechanics/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setMechanic(data);
        if (data?.hasPushSubscription) setStatus("subscribed");
      })
      .catch(() => {})
      .finally(() => setLoadingMechanic(false));
  }, [id]);

  const handleSubscribe = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("denied");
      return;
    }

    try {
      const sub = await registerAndSubscribe(VAPID_PUBLIC_KEY);
      await fetch(`/api/public/mechanics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionJson: JSON.stringify(sub) }),
      });
      setStatus("subscribed");
    } catch {
      setStatus("error");
    }
  };

  const handleUnsubscribe = async () => {
    setStatus("loading");
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = await reg?.pushManager.getSubscription();
        await sub?.unsubscribe();
      }
      await fetch(`/api/public/mechanics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionJson: null }),
      });
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  if (loadingMechanic) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!mechanic) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow text-center max-w-sm">
          <p className="text-2xl mb-2">❓</p>
          <p className="text-lg font-semibold text-gray-800">Mecánico no encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-sm mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-center">
          <TallerTotalLogo />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-2xl">
            🔧
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{mechanic.name}</h1>
            {mechanic.specialty && <p className="text-sm text-slate-500 mt-0.5">{mechanic.specialty}</p>}
          </div>

          <div className="pt-2 space-y-3">
            {status === "subscribed" ? (
              <>
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium text-sm">Notificaciones activas</span>
                </div>
                <p className="text-xs text-slate-400">
                  Vas a recibir una notificación cada vez que te asignen una orden.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnsubscribe}
                  className="gap-2 text-slate-600"
                >
                  <BellOff className="h-4 w-4" />
                  Desactivar notificaciones
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  Activá las notificaciones para que te avisemos cuando tenés una orden asignada.
                </p>

                {status === "denied" && (
                  <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                    Bloqueaste los permisos. Habilitá las notificaciones manualmente en la configuración del navegador.
                  </p>
                )}
                {status === "unsupported" && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                    Tu navegador no soporta notificaciones push.
                  </p>
                )}
                {status === "error" && (
                  <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                    Hubo un error. Intentá de nuevo.
                  </p>
                )}

                <Button
                  onClick={handleSubscribe}
                  disabled={status === "loading" || status === "denied" || status === "unsupported"}
                  className="gap-2 w-full"
                >
                  {status === "loading"
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Activando...</>
                    : <><Bell className="h-4 w-4" />Activar notificaciones</>}
                </Button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Guardá esta página en tus favoritos para volver a configurarla.
        </p>
      </div>
    </div>
  );
}
