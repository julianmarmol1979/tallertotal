"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { serviceOrdersApi, dashboardApi } from "@/lib/api";
import type { ServiceOrder, ServiceOrderStatus, DashboardMetrics } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  ClipboardList, Clock, CheckCircle, AlertCircle,
  TrendingUp, TrendingDown, Minus, DollarSign, Wrench,
} from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { toast } from "sonner";

const STATUS_TABS: { value: ServiceOrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "Open", label: "Abiertas" },
  { value: "InProgress", label: "En progreso" },
  { value: "Completed", label: "Completadas" },
];

export default function DashboardPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [allOrders, setAllOrders] = useState<ServiceOrder[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ServiceOrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadAll = useCallback(async () => {
    try {
      const [data, m] = await Promise.all([
        serviceOrdersApi.getAll(),
        dashboardApi.getMetrics(),
      ]);
      setAllOrders(data);
      setMetrics(m);
    } catch {
      // silently ignore
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
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

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [activeTab, search, pageSize]);

  const handleStatusChange = async (id: string, status: ServiceOrderStatus) => {
    try {
      await serviceOrdersApi.updateStatus(id, status);
      toast.success("Estado actualizado");
      load();
      loadAll();
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

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const counts = {
    open: allOrders.filter((o) => o.status === "Open").length,
    inProgress: allOrders.filter((o) => o.status === "InProgress").length,
    completed: allOrders.filter((o) => o.status === "Completed").length,
    total: allOrders.length,
  };

  // Delta helpers
  const delta = (current: number, previous: number) => {
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };
  const revDelta = delta(metrics?.revenueThisMonth ?? 0, metrics?.revenueLastMonth ?? 0);
  const ordDelta = delta(metrics?.ordersThisMonth ?? 0, metrics?.ordersLastMonth ?? 0);

  const monthName = new Date().toLocaleString("es-AR", { month: "long" });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen del taller</p>
      </div>

      {/* ── Métricas del mes ── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Métricas de {monthName}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Ingresos */}
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Ingresos del mes</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ${(metrics?.revenueThisMonth ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 0 })}
                  </p>
                  {revDelta !== null && (
                    <p className={`text-xs mt-1 flex items-center gap-0.5 ${revDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {revDelta > 0 ? <TrendingUp className="h-3 w-3" /> : revDelta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {revDelta > 0 ? "+" : ""}{revDelta.toFixed(1)}% vs mes anterior
                    </p>
                  )}
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Órdenes este mes */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Órdenes del mes</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{metrics?.ordersThisMonth ?? 0}</p>
                  {ordDelta !== null && (
                    <p className={`text-xs mt-1 flex items-center gap-0.5 ${ordDelta >= 0 ? "text-blue-600" : "text-red-500"}`}>
                      {ordDelta > 0 ? <TrendingUp className="h-3 w-3" /> : ordDelta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {ordDelta > 0 ? "+" : ""}{ordDelta.toFixed(1)}% vs mes anterior
                    </p>
                  )}
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mecánico más activo */}
          <Card className="border-l-4 border-l-violet-500">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Mecánico más activo</p>
                  {metrics?.topMechanic ? (
                    <>
                      <p className="text-lg font-bold text-gray-900 mt-1 truncate max-w-[160px]">
                        {metrics.topMechanic.name}
                      </p>
                      <p className="text-xs text-violet-600 mt-0.5">
                        {metrics.topMechanic.orderCount} orden{metrics.topMechanic.orderCount !== 1 ? "es" : ""} este mes
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 mt-2">Sin datos este mes</p>
                  )}
                </div>
                <div className="p-2.5 rounded-xl bg-violet-50">
                  <Wrench className="h-5 w-5 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── KPIs de estado ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<ClipboardList className="h-5 w-5 text-blue-600" />} label="Total" value={counts.total} borderClass="border-l-4 border-l-blue-500" iconBgClass="bg-blue-50" />
        <KpiCard icon={<AlertCircle className="h-5 w-5 text-sky-500" />} label="Abiertas" value={counts.open} borderClass="border-l-4 border-l-sky-400" iconBgClass="bg-sky-50" />
        <KpiCard icon={<Clock className="h-5 w-5 text-amber-500" />} label="En progreso" value={counts.inProgress} borderClass="border-l-4 border-l-amber-400" iconBgClass="bg-amber-50" />
        <KpiCard icon={<CheckCircle className="h-5 w-5 text-green-500" />} label="Completadas" value={counts.completed} borderClass="border-l-4 border-l-green-500" iconBgClass="bg-green-50" />
      </div>

      {/* ── Tabla ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Órdenes de Servicio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
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
            <>
              {/* Mobile: cards */}
              <div className="md:hidden space-y-3">
                {paginated.map((order) => (
                  <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono font-bold text-sm text-gray-900">{order.licensePlate}</span>
                        <p className="text-sm text-gray-600 mt-0.5">{order.vehicleDescription}</p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{order.customerName}</p>
                        <p className="text-xs text-gray-400">{order.customerPhone}</p>
                      </div>
                      <p className="font-semibold text-gray-900">
                        ${order.totalEstimate.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString("es-AR")}
                        {order.assignedMechanic && ` · ${order.assignedMechanic}`}
                      </p>
                      <Select
                        value={order.status}
                        onValueChange={(v) => handleStatusChange(order.id, v as ServiceOrderStatus)}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Open">Abierta</SelectItem>
                          <SelectItem value="InProgress">En progreso</SelectItem>
                          <SelectItem value="Completed">Completada</SelectItem>
                          <SelectItem value="Cancelled">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Placa</TableHead>
                      <TableHead>Vehículo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Mecánico</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Total estimado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cambiar estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((order) => (
                      <TableRow key={order.id} className="hover:bg-gray-50">
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
                            onValueChange={(v) => handleStatusChange(order.id, v as ServiceOrderStatus)}
                          >
                            <SelectTrigger className="h-8 w-36 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Open">Abierta</SelectItem>
                              <SelectItem value="InProgress">En progreso</SelectItem>
                              <SelectItem value="Completed">Completada</SelectItem>
                              <SelectItem value="Cancelled">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          <Pagination
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value, borderClass, iconBgClass }: {
  icon: React.ReactNode; label: string; value: number; borderClass: string; iconBgClass: string;
}) {
  return (
    <Card className={borderClass}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <div className={`p-2.5 rounded-xl ${iconBgClass}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
