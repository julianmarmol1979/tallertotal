import * as XLSX from "xlsx";
import type { ServiceOrder } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  Open: "Abierta",
  InProgress: "En progreso",
  Completed: "Completada",
  Cancelled: "Cancelada",
};

function fmt(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

function fmtDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-AR");
}

export function exportOrdersToExcel(orders: ServiceOrder[], filename = "ordenes.xlsx") {
  const rows = orders.map((o) => ({
    Placa: o.licensePlate,
    Vehículo: o.vehicleDescription,
    Cliente: o.customerName,
    Teléfono: o.customerPhone,
    Mecánico: o.assignedMechanic ?? "—",
    Estado: STATUS_LABELS[o.status] ?? o.status,
    "Km ingreso": o.mileageIn ?? "—",
    "Total estimado": fmt(o.totalEstimate),
    "Total final": fmt(o.totalFinal),
    "Diagnóstico / Notas": o.diagnosisNotes ?? "—",
    "Fecha creación": fmtDate(o.createdAt),
    "Fecha cierre": fmtDate(o.completedAt),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 12 }, // Placa
    { wch: 22 }, // Vehículo
    { wch: 22 }, // Cliente
    { wch: 18 }, // Teléfono
    { wch: 18 }, // Mecánico
    { wch: 14 }, // Estado
    { wch: 12 }, // Km
    { wch: 16 }, // Total est
    { wch: 14 }, // Total final
    { wch: 30 }, // Diagnóstico
    { wch: 16 }, // Fecha crea
    { wch: 14 }, // Fecha cierre
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Órdenes");
  XLSX.writeFile(wb, filename);
}
