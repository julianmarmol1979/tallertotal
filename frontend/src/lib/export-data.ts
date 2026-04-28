import * as XLSX from "xlsx";
import type { Customer, Vehicle, Mechanic } from "@/types";

function fmtDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-AR");
}

export function exportCustomersToExcel(customers: Customer[], filename = "clientes.xlsx") {
  const rows = customers.map((c) => ({
    Nombre: c.name,
    Teléfono: c.phone,
    Email: c.email ?? "—",
    Vehículos: c.vehicleCount,
    "Fecha alta": fmtDate(c.createdAt),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 28 }, // Nombre
    { wch: 18 }, // Teléfono
    { wch: 28 }, // Email
    { wch: 10 }, // Vehículos
    { wch: 14 }, // Fecha
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clientes");
  XLSX.writeFile(wb, filename);
}

export function exportVehiclesToExcel(vehicles: Vehicle[], filename = "vehiculos.xlsx") {
  const rows = vehicles.map((v) => ({
    Placa: v.licensePlate,
    Marca: v.brand,
    Modelo: v.model,
    Año: v.year,
    Color: v.color ?? "—",
    Cliente: v.customerName,
    Notas: v.notes ?? "—",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 12 }, // Placa
    { wch: 16 }, // Marca
    { wch: 16 }, // Modelo
    { wch: 8 },  // Año
    { wch: 14 }, // Color
    { wch: 26 }, // Cliente
    { wch: 24 }, // Notas
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vehículos");
  XLSX.writeFile(wb, filename);
}

export function exportMechanicsToExcel(mechanics: Mechanic[], filename = "mecanicos.xlsx") {
  const rows = mechanics.map((m) => ({
    Nombre: m.name,
    Teléfono: m.phone ?? "—",
    Especialidad: m.specialty ?? "—",
    Estado: m.isActive ? "Activo" : "Inactivo",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 28 }, // Nombre
    { wch: 18 }, // Teléfono
    { wch: 22 }, // Especialidad
    { wch: 10 }, // Estado
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mecánicos");
  XLSX.writeFile(wb, filename);
}
