"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { serviceOrdersApi } from "@/lib/api";
import { exportOrdersToExcel } from "@/lib/export-orders";
import type { ServiceOrder, ServiceOrderStatus } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Plus, FileSpreadsheet, Download } from "lucide-react";
import { toast } from "sonner";

const STATUS_TABS: { value: ServiceOrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "Open", label: "Abiertas" },
  { value: "InProgress", label: "En progreso" },
  { value: "Completed", label: "Completadas" },
  { value: "Cancelled", label: "Canceladas" },
];

const STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  Open: "Abierta",
  InProgress: "En progreso",
  Completed: "Completada",
  Cancelled: "Cancelada",
};

export default function OrdenesPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ServiceOrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const data = await serviceOrdersApi.getAll(
        activeTab !== "all" ? { status: activeTab } : undefined
      );
      setOrders(data);
    } catch {
      toast.error("No se pudo cargar las órdenes");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: string, status: ServiceOrderStatus) => {
    try {
      await serviceOrdersApi.updateStatus(id, status);
      toast.success("Estado actualizado");
      load();
    } catch {
      toast.error("Error al actualizar estado");
    }
  };

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.licensePlate.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      (o.assignedMechanic ?? "").toLowerCase().includes(q)
    );
  });

  // ── Selection helpers ──────────────────────────────────────────────────────
  const allFilteredIds = filtered.map((o) => o.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id));
  const someSelected = allFilteredIds.some((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...allFilteredIds]));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Export helpers ─────────────────────────────────────────────────────────
  const exportSelected = () => {
    const toExport = filtered.filter((o) => selected.has(o.id));
    if (!toExport.length) return;
    exportOrdersToExcel(toExport, `ordenes-seleccionadas-${Date.now()}.xlsx`);
    toast.success(`${toExport.length} orden${toExport.length !== 1 ? "es" : ""} exportada${toExport.length !== 1 ? "s" : ""}`);
  };

  const exportOne = (order: ServiceOrder) => {
    exportOrdersToExcel([order], `orden-${order.licensePlate}-${Date.now()}.xlsx`);
    toast.success("Orden exportada");
  };

  const selectedCount = allFilteredIds.filter((id) => selected.has(id)).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Órdenes de Servicio</h1>
          <p className="text-sm text-gray-500 mt-1">{orders.length} órdenes en total</p>
        </div>
        <Link href="/ordenes/nueva" className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Orden
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base font-semibold">Listado</CardTitle>
            {someSelected && (
              <Button size="sm" variant="outline" onClick={exportSelected} className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50">
                <FileSpreadsheet className="h-4 w-4" />
                Exportar {selectedCount} seleccionada{selectedCount !== 1 ? "s" : ""}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.value
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <Input
              placeholder="Buscar por placa, cliente o mecánico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No hay órdenes que mostrar</div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                        aria-label="Seleccionar todas"
                      />
                    </TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Mecánico</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total estimado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cambiar estado</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((order) => (
                    <TableRow
                      key={order.id}
                      className={`hover:bg-gray-50 ${selected.has(order.id) ? "bg-blue-50/60" : ""}`}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected.has(order.id)}
                          onChange={() => toggleOne(order.id)}
                          className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                          aria-label={`Seleccionar orden ${order.licensePlate}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-sm">{order.licensePlate}</TableCell>
                      <TableCell className="text-sm">{order.vehicleDescription}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{order.customerName}</div>
                        <div className="text-xs text-gray-400">{order.customerPhone}</div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{order.assignedMechanic ?? "—"}</TableCell>
                      <TableCell><StatusBadge status={order.status} /></TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        ${order.totalEstimate.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(v) => v && handleStatusChange(order.id, v as ServiceOrderStatus)}
                        >
                          <SelectTrigger className="h-8 w-36 text-xs">
                            <span className="flex-1 text-left">{STATUS_LABELS[order.status]}</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Open">Abierta</SelectItem>
                            <SelectItem value="InProgress">En progreso</SelectItem>
                            <SelectItem value="Completed">Completada</SelectItem>
                            <SelectItem value="Cancelled">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => exportOne(order)}
                          title="Exportar esta orden a Excel"
                          className="text-gray-400 hover:text-green-600"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
