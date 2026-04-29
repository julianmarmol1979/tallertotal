"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { serviceOrdersApi } from "@/lib/api";
import type { ServiceOrder } from "@/types";
import Image from "next/image";
import { Printer } from "lucide-react";

const itemTypeLabel = (type: string) => (type === "Labor" ? "Mano de obra" : "Repuesto");

export default function ImprimirOrdenPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    serviceOrdersApi.getById(id).then(setOrder).catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500 text-sm">Orden no encontrada o sin acceso.</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400 text-sm">Cargando orden...</p>
      </div>
    );
  }

  const orderNumber = order.id.slice(-8).toUpperCase();
  const statusLabel: Record<string, string> = {
    Open: "Abierta", InProgress: "En progreso", Completed: "Completada", Cancelled: "Cancelada",
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      {/* Print button — hidden when printing */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Printer className="h-4 w-4" />
          Imprimir / Guardar PDF
        </button>
        <button
          onClick={() => window.close()}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg shadow hover:bg-gray-50 transition-colors text-sm"
        >
          Cerrar
        </button>
      </div>

      <div className="max-w-[820px] mx-auto p-8 bg-white min-h-screen text-gray-900 text-sm">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-blue-600">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="TallerTotal" width={40} height={40} className="rounded-xl" />
            <span className="text-2xl font-bold text-slate-900">TallerTotal</span>
          </div>
          <div className="text-right">
            <p className="text-base font-bold text-gray-700 uppercase tracking-wide">Orden de Servicio</p>
            <p className="text-blue-600 font-mono font-bold text-lg">#{orderNumber}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(order.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* ── Cliente + Vehículo ── */}
        <div className="grid grid-cols-2 gap-5 mb-5">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Cliente</p>
            <p className="font-semibold text-gray-900">{order.customerName}</p>
            <p className="text-gray-500 text-xs mt-0.5">{order.customerPhone}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Vehículo</p>
            <p className="font-mono font-bold text-xl text-gray-900">{order.licensePlate}</p>
            <p className="text-gray-700 text-xs mt-0.5">{order.vehicleDescription}</p>
          </div>
        </div>

        {/* ── Detalles operativos ── */}
        <div className="grid grid-cols-4 gap-3 mb-5 text-xs">
          <div className="bg-gray-50 rounded p-2 border border-gray-100">
            <p className="text-gray-400 mb-0.5">Mecánico</p>
            <p className="font-semibold">{order.assignedMechanic || "—"}</p>
          </div>
          <div className="bg-gray-50 rounded p-2 border border-gray-100">
            <p className="text-gray-400 mb-0.5">Km entrada</p>
            <p className="font-semibold">{order.mileageIn?.toLocaleString("es-AR") || "—"}</p>
          </div>
          <div className="bg-gray-50 rounded p-2 border border-gray-100">
            <p className="text-gray-400 mb-0.5">Entrega estimada</p>
            <p className="font-semibold">
              {order.estimatedDeliveryAt
                ? new Date(order.estimatedDeliveryAt + "T00:00:00").toLocaleDateString("es-AR")
                : "—"}
            </p>
          </div>
          <div className="bg-gray-50 rounded p-2 border border-gray-100">
            <p className="text-gray-400 mb-0.5">Estado</p>
            <p className="font-semibold">{statusLabel[order.status] ?? order.status}</p>
          </div>
        </div>

        {/* ── Diagnóstico ── */}
        {order.diagnosisNotes && (
          <div className="mb-5">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Diagnóstico / Trabajo a realizar</p>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-gray-700 whitespace-pre-wrap leading-relaxed">
              {order.diagnosisNotes}
            </div>
          </div>
        )}

        {/* ── Items ── */}
        {order.items.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Detalle de trabajos y repuestos</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-left">
                  <th className="px-3 py-2 rounded-tl font-medium w-8">#</th>
                  <th className="px-3 py-2 font-medium">Descripción</th>
                  <th className="px-3 py-2 font-medium w-28">Tipo</th>
                  <th className="px-3 py-2 font-medium text-right w-16">Cant.</th>
                  <th className="px-3 py-2 font-medium text-right w-24">P. Unit.</th>
                  <th className="px-3 py-2 font-medium text-right w-24 rounded-tr">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2 text-gray-400 border-b border-gray-100">{i + 1}</td>
                    <td className="px-3 py-2 border-b border-gray-100">{item.description}</td>
                    <td className="px-3 py-2 text-gray-500 border-b border-gray-100">{itemTypeLabel(item.type)}</td>
                    <td className="px-3 py-2 text-right border-b border-gray-100">{item.quantity.toLocaleString("es-AR")}</td>
                    <td className="px-3 py-2 text-right border-b border-gray-100">
                      ${item.unitPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold border-b border-gray-100">
                      ${item.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Totales ── */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2 border rounded-lg p-3 bg-gray-50">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total estimado</span>
              <span className="font-semibold">
                ${order.totalEstimate.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {order.totalFinal > 0 && (
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-800">Total final</span>
                <span className="font-bold text-green-700 text-base">
                  ${order.totalFinal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Firmas ── */}
        <div className="border-t-2 border-gray-200 pt-6">
          <div className="grid grid-cols-2 gap-12">
            <div className="text-center">
              <div className="border-b border-gray-400 h-10 mb-2" />
              <p className="text-xs text-gray-400">Firma y aclaración del cliente</p>
            </div>
            <div className="text-center">
              <div className="border-b border-gray-400 h-10 mb-2" />
              <p className="text-xs text-gray-400">Firma del mecánico / responsable</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-[10px] text-gray-300">
          Generado por TallerTotal · Sistema de gestión para talleres mecánicos
        </div>
      </div>
    </>
  );
}
