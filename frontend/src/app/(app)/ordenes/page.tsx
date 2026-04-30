"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { serviceOrdersApi, mechanicsApi } from "@/lib/api";
import { exportOrdersToExcel } from "@/lib/export-orders";
import type { ServiceOrder, ServiceOrderStatus, ServiceOrderLog, QuoteStatus, Mechanic } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, FileSpreadsheet, Download, ChevronUp, ChevronDown, ChevronsUpDown,
  Printer, FileText, CheckCircle, XCircle, History, Link,
} from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { toast } from "sonner";

// ── Constants ──────────────────────────────────────────────────────────────────

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

const DEFAULT_PAGE_SIZE = 10;

type SortCol = "licensePlate" | "customerName" | "assignedMechanic" | "status" | "totalEstimate" | "createdAt" | "estimatedDeliveryAt";

// ── Sort helpers ───────────────────────────────────────────────────────────────

function sortOrders(orders: ServiceOrder[], col: SortCol, dir: "asc" | "desc"): ServiceOrder[] {
  return [...orders].sort((a, b) => {
    let cmp = 0;
    switch (col) {
      case "licensePlate":      cmp = a.licensePlate.localeCompare(b.licensePlate); break;
      case "customerName":      cmp = a.customerName.localeCompare(b.customerName); break;
      case "assignedMechanic":  cmp = (a.assignedMechanic ?? "").localeCompare(b.assignedMechanic ?? ""); break;
      case "status":            cmp = a.status.localeCompare(b.status); break;
      case "totalEstimate":     cmp = a.totalEstimate - b.totalEstimate; break;
      case "createdAt":         cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
      case "estimatedDeliveryAt":
        cmp = (a.estimatedDeliveryAt ?? "").localeCompare(b.estimatedDeliveryAt ?? ""); break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SortHead({ col, label, current, dir, onSort, className }: {
  col: SortCol; label: string; current: SortCol | null; dir: "asc" | "desc";
  onSort: (col: SortCol) => void; className?: string;
}) {
  const active = current === col;
  return (
    <TableHead className={className}>
      <button onClick={() => onSort(col)} className="flex items-center gap-1 hover:text-gray-900 transition-colors select-none">
        {label}
        {active
          ? dir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
          : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
      </button>
    </TableHead>
  );
}

function QuoteBadge({ status }: { status: QuoteStatus }) {
  if (status === "None") return null;
  const cfg: Record<Exclude<QuoteStatus, "None">, { label: string; cls: string }> = {
    Pending:  { label: "⏳ Presup. enviado",   cls: "text-amber-700 bg-amber-50 border-amber-200" },
    Approved: { label: "✅ Presup. aprobado",  cls: "text-green-700 bg-green-50 border-green-200" },
    Rejected: { label: "❌ Presup. rechazado", cls: "text-red-700 bg-red-50 border-red-200" },
  };
  const { label, cls } = cfg[status as Exclude<QuoteStatus, "None">];
  return (
    <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border mt-0.5 ${cls}`}>
      {label}
    </span>
  );
}

function formatLogEvent(event: string) {
  const map: Record<string, string> = {
    Created:            "Orden creada",
    StatusChanged:      "Estado cambiado",
    QuoteStatusChanged: "Presupuesto actualizado",
    Updated:            "Orden editada",
  };
  return map[event] ?? event;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function OrdenesPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ServiceOrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [mechanicFilter, setMechanicFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortCol, setSortCol] = useState<SortCol | null>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Logs dialog
  const [logsOrderId, setLogsOrderId] = useState<string | null>(null);
  const [logs, setLogs] = useState<ServiceOrderLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const params: Parameters<typeof serviceOrdersApi.getAll>[0] = {};
      if (activeTab !== "all") params.status = activeTab;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const data = await serviceOrdersApi.getAll(Object.keys(params).length ? params : undefined);
      setOrders(data);
    } catch {
      toast.error("No se pudo cargar las órdenes");
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { mechanicsApi.getAll().then(setMechanics).catch(() => {}); }, []);
  useEffect(() => { setPage(1); }, [activeTab, search, mechanicFilter, dateFrom, dateTo, sortCol, sortDir, pageSize]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStatusChange = async (id: string, status: ServiceOrderStatus) => {
    try {
      await serviceOrdersApi.updateStatus(id, status);
      toast.success("Estado actualizado");
      load();
    } catch {
      toast.error("Error al actualizar estado");
    }
  };

  const handleQuote = async (id: string, quoteStatus: QuoteStatus) => {
    const labels: Record<QuoteStatus, string> = {
      None: "Reiniciado",
      Pending: "Presupuesto enviado al cliente",
      Approved: "Presupuesto aprobado",
      Rejected: "Presupuesto rechazado",
    };
    try {
      await serviceOrdersApi.updateQuote(id, quoteStatus);
      toast.success(labels[quoteStatus]);
      load();
    } catch {
      toast.error("Error al actualizar presupuesto");
    }
  };

  const openLogs = async (orderId: string) => {
    setLogsOrderId(orderId);
    setLogsLoading(true);
    setLogs([]);
    try {
      const data = await serviceOrdersApi.getLogs(orderId);
      setLogs(data);
    } catch {
      toast.error("Error al cargar historial");
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = orders;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.licensePlate.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          (o.assignedMechanic ?? "").toLowerCase().includes(q)
      );
    }
    if (mechanicFilter) result = result.filter((o) => o.assignedMechanic === mechanicFilter);
    return result;
  }, [orders, search, mechanicFilter]);

  const sorted = useMemo(
    () => (sortCol ? sortOrders(filtered, sortCol, sortDir) : filtered),
    [filtered, sortCol, sortDir]
  );

  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  // ── Selection helpers ──────────────────────────────────────────────────────

  const allFilteredIds = filtered.map((o) => o.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id));
  const someSelected = allFilteredIds.some((id) => selected.has(id));
  const selectedCount = allFilteredIds.filter((id) => selected.has(id)).length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => { const next = new Set(prev); allFilteredIds.forEach((id) => next.delete(id)); return next; });
    } else {
      setSelected((prev) => new Set([...prev, ...allFilteredIds]));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  // ── Export helpers ─────────────────────────────────────────────────────────

  const handleExport = () => {
    const toExport = someSelected ? filtered.filter((o) => selected.has(o.id)) : filtered;
    if (!toExport.length) return;
    exportOrdersToExcel(toExport, `ordenes-${Date.now()}.xlsx`);
    const n = toExport.length;
    toast.success(`${n} orden${n !== 1 ? "es" : ""} exportada${n !== 1 ? "s" : ""}`);
  };

  const exportOne = (order: ServiceOrder) => {
    exportOrdersToExcel([order], `orden-${order.licensePlate}-${Date.now()}.xlsx`);
    toast.success("Orden exportada");
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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
            {filtered.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50">
                <FileSpreadsheet className="h-4 w-4" />
                {someSelected ? `Exportar ${selectedCount} seleccionada${selectedCount !== 1 ? "s" : ""}` : `Exportar todas (${filtered.length})`}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Filters row */}
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            {/* Status tabs */}
            <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <Input
              placeholder="Buscar por placa, cliente o mecánico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />

            {/* Mechanic filter */}
            {mechanics.length > 0 && (
              <select
                value={mechanicFilter}
                onChange={(e) => setMechanicFilter(e.target.value)}
                className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring/50 sm:max-w-[200px]"
              >
                <option value="">Todos los mecánicos</option>
                {mechanics.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            )}

            {/* Date range */}
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[150px] text-sm"
                title="Desde"
              />
              <span className="text-gray-400 text-sm shrink-0">→</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[150px] text-sm"
                title="Hasta"
              />
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className="text-xs text-gray-400 hover:text-gray-700 underline shrink-0"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No hay órdenes que mostrar</div>
          ) : (
            <>
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
                      <SortHead col="licensePlate" label="Placa" current={sortCol} dir={sortDir} onSort={handleSort} />
                      <TableHead>Vehículo</TableHead>
                      <SortHead col="customerName" label="Cliente" current={sortCol} dir={sortDir} onSort={handleSort} />
                      <SortHead col="assignedMechanic" label="Mecánico" current={sortCol} dir={sortDir} onSort={handleSort} />
                      <SortHead col="status" label="Estado" current={sortCol} dir={sortDir} onSort={handleSort} />
                      <SortHead col="totalEstimate" label="Total est." current={sortCol} dir={sortDir} onSort={handleSort} className="text-right" />
                      <SortHead col="estimatedDeliveryAt" label="Entrega" current={sortCol} dir={sortDir} onSort={handleSort} />
                      <SortHead col="createdAt" label="Ingreso" current={sortCol} dir={sortDir} onSort={handleSort} />
                      <TableHead>Cambiar estado</TableHead>
                      <TableHead className="w-28">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((order) => (
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
                          />
                        </TableCell>
                        <TableCell className="font-mono font-semibold text-sm">{order.licensePlate}</TableCell>
                        <TableCell className="text-sm">{order.vehicleDescription}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{order.customerName}</div>
                          <div className="text-xs text-gray-400">{order.customerPhone}</div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {order.assignedMechanic ?? "—"}
                          {order.internalNotes && (
                            <p className="text-xs text-amber-600 italic mt-0.5 max-w-[140px] truncate" title={order.internalNotes}>
                              📝 {order.internalNotes}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-0.5">
                            <StatusBadge status={order.status} />
                            <QuoteBadge status={order.quoteStatus} />
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          ${order.totalEstimate.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {order.estimatedDeliveryAt
                            ? new Date(order.estimatedDeliveryAt + "T00:00:00").toLocaleDateString("es-AR")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString("es-AR")}
                        </TableCell>
                        <TableCell>
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value as ServiceOrderStatus)}
                            className="h-8 w-36 rounded-lg border border-input bg-transparent px-2 text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring/50"
                          >
                            {STATUS_TABS.filter((t) => t.value !== "all").map((t) => (
                              <option key={t.value} value={t.value}>{STATUS_LABELS[t.value as ServiceOrderStatus]}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            {/* Enviar presupuesto */}
                            {order.quoteStatus === "None" &&
                              order.status !== "Completed" &&
                              order.status !== "Cancelled" && (
                              <Button variant="ghost" size="icon-sm"
                                title="Enviar presupuesto al cliente (WhatsApp)"
                                onClick={() => handleQuote(order.id, "Pending")}
                                className="text-gray-400 hover:text-blue-600">
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {/* Aprobar presupuesto */}
                            {order.quoteStatus === "Pending" && (
                              <>
                                <Button variant="ghost" size="icon-sm"
                                  title="Aprobar presupuesto"
                                  onClick={() => handleQuote(order.id, "Approved")}
                                  className="text-gray-400 hover:text-green-600">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon-sm"
                                  title="Rechazar presupuesto"
                                  onClick={() => handleQuote(order.id, "Rejected")}
                                  className="text-gray-400 hover:text-red-600">
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {/* Imprimir */}
                            <Button variant="ghost" size="icon-sm"
                              title="Imprimir orden"
                              onClick={() => window.open(`/imprimir/${order.id}`, "_blank")}
                              className="text-gray-400 hover:text-blue-600">
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                            {/* Copiar link del portal */}
                            <Button variant="ghost" size="icon-sm"
                              title="Copiar link del portal para el cliente"
                              onClick={() => {
                                const url = `${window.location.origin}/portal/${order.portalToken}`;
                                navigator.clipboard.writeText(url);
                                toast.success("Link del portal copiado");
                              }}
                              className="text-gray-400 hover:text-emerald-600">
                              <Link className="h-3.5 w-3.5" />
                            </Button>
                            {/* Historial */}
                            <Button variant="ghost" size="icon-sm"
                              title="Ver historial de cambios"
                              onClick={() => openLogs(order.id)}
                              className="text-gray-400 hover:text-violet-600">
                              <History className="h-3.5 w-3.5" />
                            </Button>
                            {/* Exportar Excel */}
                            <Button variant="ghost" size="icon-sm"
                              title="Exportar a Excel"
                              onClick={() => exportOne(order)}
                              className="text-gray-400 hover:text-green-600">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                total={sorted.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Logs dialog ───────────────────────────────────────────────────────── */}
      <Dialog open={!!logsOrderId} onOpenChange={(open) => { if (!open) { setLogsOrderId(null); setLogs([]); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-violet-600" />
              Historial de cambios
            </DialogTitle>
          </DialogHeader>
          {logsLoading ? (
            <div className="py-8 text-center text-sm text-gray-400">Cargando...</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">Sin historial registrado</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 py-1">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{formatLogEvent(log.event)}</div>
                    {log.oldValue && log.newValue && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        <span className="line-through text-red-400">{log.oldValue}</span>
                        <span className="mx-1 text-gray-300">→</span>
                        <span className="text-green-600 font-medium">{log.newValue}</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-0.5">
                      {log.changedBy} · {new Date(log.changedAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
