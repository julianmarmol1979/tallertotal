import type { PortalOrder, ServiceOrderStatus, QuoteStatus } from "@/types";

interface Props {
  params: Promise<{ token: string }>;
}

async function fetchOrder(token: string): Promise<PortalOrder | null> {
  try {
    const res = await fetch(
      `${process.env.BACKEND_URL}/api/portal/${token}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  Open: "Abierta",
  InProgress: "En progreso",
  Completed: "Completada",
  Cancelled: "Cancelada",
};

const STATUS_COLOR: Record<ServiceOrderStatus, string> = {
  Open: "bg-sky-100 text-sky-700",
  InProgress: "bg-amber-100 text-amber-700",
  Completed: "bg-green-100 text-green-700",
  Cancelled: "bg-gray-100 text-gray-500",
};

const QUOTE_LABEL: Record<Exclude<QuoteStatus, "None">, { label: string; cls: string }> = {
  Pending:  { label: "⏳ Presupuesto enviado — esperando aprobación", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  Approved: { label: "✅ Presupuesto aprobado",                        cls: "bg-green-50 text-green-700 border-green-200" },
  Rejected: { label: "❌ Presupuesto rechazado",                       cls: "bg-red-50 text-red-700 border-red-200" },
};

export default async function PortalPage({ params }: Props) {
  const { token } = await params;
  const order = await fetchOrder(token);

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow text-center max-w-sm">
          <p className="text-2xl mb-2">🔍</p>
          <h1 className="text-lg font-semibold text-gray-800 mb-1">Orden no encontrada</h1>
          <p className="text-sm text-gray-500">El enlace puede haber expirado o ser incorrecto.</p>
        </div>
      </div>
    );
  }

  const orderNum  = order.id.slice(-8).toUpperCase();
  const itemTypeLabel = (type: string) => (type === "Labor" ? "Mano de obra" : "Repuesto");

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Header */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-slate-900 text-lg">TallerTotal</span>
            <span className="font-mono text-xs text-slate-400">#{orderNum}</span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Cliente</span>
              <span className="font-medium text-slate-800">{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Vehículo</span>
              <span className="font-medium text-slate-800 text-right">{order.licensePlate} — {order.vehicleDescription}</span>
            </div>
            {order.estimatedDeliveryAt && (
              <div className="flex justify-between">
                <span className="text-slate-500">Entrega estimada</span>
                <span className="font-medium text-slate-800">
                  {new Date(order.estimatedDeliveryAt + "T00:00:00").toLocaleDateString("es-AR")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Estado actual</p>
          <span className={`inline-block text-sm font-semibold px-3 py-1.5 rounded-full ${STATUS_COLOR[order.status]}`}>
            {STATUS_LABEL[order.status]}
          </span>

          {order.quoteStatus !== "None" && (
            <div className={`mt-3 text-sm font-medium px-3 py-2 rounded-lg border ${QUOTE_LABEL[order.quoteStatus as Exclude<QuoteStatus, "None">].cls}`}>
              {QUOTE_LABEL[order.quoteStatus as Exclude<QuoteStatus, "None">].label}
            </div>
          )}
        </div>

        {/* Diagnosis */}
        {order.diagnosisNotes && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Diagnóstico</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{order.diagnosisNotes}</p>
          </div>
        )}

        {/* Items */}
        {order.items.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Detalle</p>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="font-medium text-slate-800">{item.description}</p>
                    <p className="text-xs text-slate-400">{itemTypeLabel(item.type)} × {item.quantity}</p>
                  </div>
                  <span className="font-semibold text-slate-800">
                    ${item.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total estimado</span>
                <span className="font-semibold">${order.totalEstimate.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
              </div>
              {order.totalFinal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-800">Total final</span>
                  <span className="font-bold text-green-700 text-base">
                    ${order.totalFinal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 pb-4">
          TallerTotal · Solo vos podés ver esta página
        </p>
      </div>
    </div>
  );
}
