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
  ClipboardList, CheckCircle,
  TrendingUp, TrendingDown, Minus, DollarSign,
  TicketPercent, AlertTriangle,
} from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const STATUS_TABS: { value: ServiceOrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "Open", label: "Abiertas" },
  { value: "InProgress", label: "En progreso" },
  { value: "Completed", label: "Completadas" },
];

const STATUS_COLORS: Record<string, string> = {
  Open: "#0ea5e9",
  InProgress: "#f59e0b",
  Completed: "#10b981",
  Cancelled: "#ef4444",
};

const fmt = (n: number) =>
  "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 0 });

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

  // Delta helpers
  const delta = (current: number, previous: number) => {
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };
  const revDelta = delta(metrics?.revenueThisMonth ?? 0, metrics?.revenueLastMonth ?? 0);
  const ordDelta = delta(metrics?.ordersThisMonth ?? 0, metrics?.ordersLastMonth ?? 0);

  const monthName = new Date().toLocaleString("es-AR", { month: "long" });

  // Pie chart data
  const pieData = (metrics?.ordersByStatus ?? []).map((s) => ({
    name: statusLabel(s.status),
    value: s.count,
    key: s.status,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">
          Resumen del taller · {monthName} {new Date().getFullYear()}
        </p>
      </div>

      {/* Top KPI row — 5 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Ingresos del mes */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Ingresos del mes</p>
                <p className="text-xl font-bold text-gray-900 mt-1 truncate">
                  {fmt(metrics?.revenueThisMonth ?? 0)}
                </p>
                <DeltaBadge delta={revDelta} />
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 shrink-0">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Órdenes del mes */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Órdenes del mes</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{metrics?.ordersThisMonth ?? 0}</p>
                <DeltaBadge delta={ordDelta} />
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 shrink-0">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ticket promedio */}
        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Ticket promedio</p>
                <p className="text-xl font-bold text-gray-900 mt-1 truncate">
                  {fmt(metrics?.avgTicket ?? 0)}
                </p>
                <p className="text-xs text-gray-400 mt-1">órdenes completadas</p>
              </div>
              <div className="p-2.5 rounded-xl bg-violet-50 shrink-0">
                <TicketPercent className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasa de completado */}
        <Card className="border-l-4 border-l-teal-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Tasa completado</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {(metrics?.completionRate ?? 0).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">del mes actual</p>
              </div>
              <div className="p-2.5 rounded-xl bg-teal-50 shrink-0">
                <CheckCircle className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Órdenes vencidas */}
        <Card className={`border-l-4 ${(metrics?.overdueCount ?? 0) > 0 ? "border-l-red-500" : "border-l-gray-300"}`}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Órdenes vencidas</p>
                <p className={`text-xl font-bold mt-1 ${(metrics?.overdueCount ?? 0) > 0 ? "text-red-600" : "text-gray-900"}`}>
                  {metrics?.overdueCount ?? 0}
                </p>
                <p className="text-xs text-gray-400 mt-1">plazo superado</p>
              </div>
              <div className={`p-2.5 rounded-xl shrink-0 ${(metrics?.overdueCount ?? 0) > 0 ? "bg-red-50" : "bg-gray-50"}`}>
                <AlertTriangle className={`h-5 w-5 ${(metrics?.overdueCount ?? 0) > 0 ? "text-red-500" : "text-gray-400"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 1: Revenue + Orders bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Ingresos últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            {(metrics?.monthlyStats?.length ?? 0) === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={metrics!.monthlyStats} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => "$" + (v as number).toLocaleString("es-AR")}
                    width={70}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [fmt(value ?? 0), "Ingresos"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Orders bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Órdenes últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            {(metrics?.monthlyStats?.length ?? 0) === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={metrics!.monthlyStats} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={32}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [value ?? 0, "Órdenes"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  />
                  <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Pie by status + Mechanic horizontal bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart: orders by status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Órdenes por estado</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined, _: string, props: { payload?: { name?: string } }) => {
                      const v = value ?? 0;
                      return [`${v} orden${v !== 1 ? "es" : ""}`, props.payload?.name ?? ""];
                    }}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ fontSize: 12, color: "#374151" }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Horizontal bar: mechanic performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Rendimiento por mecánico este mes</CardTitle>
          </CardHeader>
          <CardContent>
            {(metrics?.mechanicStats?.length ?? 0) === 0 ? (
              <EmptyChart label="Sin datos este mes" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  layout="vertical"
                  data={metrics!.mechanicStats}
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#374151" }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip
                    formatter={(value: number | undefined, name: string) => {
                      const v = value ?? 0;
                      return name === "orders"
                        ? [`${v} orden${v !== 1 ? "es" : ""}`, "Órdenes"]
                        : [fmt(v), "Ingresos"];
                    }}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  />
                  <Bar dataKey="orders" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="orders" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders table */}
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

// ── Helper components ──────────────────────────────────────────────────────────

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <p className="text-xs text-gray-400 mt-1">sin datos previos</p>;
  const up = delta >= 0;
  return (
    <p className={`text-xs mt-1 flex items-center gap-0.5 ${up ? "text-emerald-600" : "text-red-500"}`}>
      {delta > 0
        ? <TrendingUp className="h-3 w-3" />
        : delta < 0
        ? <TrendingDown className="h-3 w-3" />
        : <Minus className="h-3 w-3" />}
      {delta > 0 ? "+" : ""}{delta.toFixed(1)}% vs mes anterior
    </p>
  );
}

function EmptyChart({ label = "Sin datos" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center h-[240px] text-sm text-gray-400">
      {label}
    </div>
  );
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    Open: "Abiertas",
    InProgress: "En progreso",
    Completed: "Completadas",
    Cancelled: "Canceladas",
  };
  return map[status] ?? status;
}

