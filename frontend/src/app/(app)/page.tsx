"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { serviceOrdersApi } from "@/lib/api";
import type { ServiceOrder, ServiceOrderStatus } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ClipboardList, Clock, CheckCircle, AlertCircle } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ServiceOrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadAll = useCallback(async () => {
    try {
      const data = await serviceOrdersApi.getAll();
      setAllOrders(data);
    } catch {
      // silently ignore counts error
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen del taller</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<ClipboardList className="h-5 w-5 text-blue-600" />} label="Total" value={counts.total} />
        <KpiCard icon={<AlertCircle className="h-5 w-5 text-sky-500" />} label="Abiertas" value={counts.open} />
        <KpiCard icon={<Clock className="h-5 w-5 text-amber-500" />} label="En progreso" value={counts.inProgress} />
        <KpiCard icon={<CheckCircle className="h-5 w-5 text-green-500" />} label="Completadas" value={counts.completed} />
      </div>

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

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <div className="p-2 rounded-lg bg-gray-50">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
