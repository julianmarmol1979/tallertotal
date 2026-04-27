"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi, type TenantResponse, type UserResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, ChevronDown, ChevronRight, Loader2, Trash2, Power } from "lucide-react";

// ── Tenant row ────────────────────────────────────────────────────────────────

function TenantRow({ tenant, onToggle }: { tenant: TenantResponse; onToggle: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [toggling, setToggling] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await adminApi.getUsers(tenant.id);
      setUsers(data);
    } catch {
      toast.error("No se pudieron cargar los usuarios");
    } finally {
      setLoadingUsers(false);
    }
  }, [tenant.id]);

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && users.length === 0) loadUsers();
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      await adminApi.toggleTenant(tenant.id);
      toast.success(`Taller ${tenant.isActive ? "desactivado" : "activado"}`);
      onToggle();
    } catch {
      toast.error("Error al cambiar estado del taller");
    } finally {
      setToggling(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await adminApi.deleteUser(userId);
      toast.success("Usuario eliminado");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      toast.error("Error al eliminar usuario");
    }
  };

  const handleUserCreated = (user: UserResponse) => {
    setUsers((prev) => [...prev, user]);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={handleExpand}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={expanded ? "Colapsar" : "Expandir"}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{tenant.name}</span>
            <Badge variant={tenant.isActive ? "default" : "secondary"} className="text-xs">
              {tenant.isActive ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {tenant.userCount} usuario{tenant.userCount !== 1 ? "s" : ""} ·{" "}
            {new Date(tenant.createdAt).toLocaleDateString("es-AR")}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            disabled={toggling}
            className={tenant.isActive ? "text-gray-500 hover:text-red-600" : "text-gray-500 hover:text-green-600"}
          >
            {toggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Power className="h-4 w-4" />
            )}
            <span className="hidden sm:inline ml-1.5">{tenant.isActive ? "Desactivar" : "Activar"}</span>
          </Button>

          <CreateUserDialog tenantId={tenant.id} onCreated={handleUserCreated} />
        </div>
      </div>

      {/* Users list */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          {loadingUsers ? (
            <p className="text-xs text-gray-400 py-2">Cargando usuarios...</p>
          ) : users.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">Sin usuarios. Creá el primero.</p>
          ) : (
            <ul className="space-y-2">
              {users.map((user) => (
                <li key={user.id} className="flex items-center gap-3 text-sm">
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="font-medium text-gray-800 truncate">{user.username}</span>
                    <Badge variant="outline" className="text-xs shrink-0">{user.role}</Badge>
                  </div>
                  <span className="text-xs text-gray-400 hidden sm:block shrink-0">
                    {new Date(user.createdAt).toLocaleDateString("es-AR")}
                  </span>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                    aria-label="Eliminar usuario"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Create user dialog ────────────────────────────────────────────────────────

function CreateUserDialog({
  tenantId,
  onCreated,
}: {
  tenantId: string;
  onCreated: (user: UserResponse) => void;
}) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Owner");
  const [loading, setLoading] = useState(false);

  const reset = () => { setUsername(""); setPassword(""); setRole("Owner"); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await adminApi.createUser(tenantId, { username, password, role });
      toast.success("Usuario creado");
      onCreated(user);
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger render={
        <Button variant="outline" size="sm">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Usuario
        </Button>
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-username" required>Usuario</Label>
            <Input
              id="new-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="juan"
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password" required>Contraseña</Label>
            <PasswordInput
              id="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Owner">Owner</SelectItem>
                <SelectItem value="Mechanic">Mechanic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Create tenant dialog ──────────────────────────────────────────────────────

function CreateTenantDialog({ onCreated }: { onCreated: (tenant: TenantResponse) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tenant = await adminApi.createTenant(name);
      toast.success("Taller creado");
      onCreated(tenant);
      setOpen(false);
      setName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear taller");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo taller
        </Button>
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo taller</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="tenant-name" required>Nombre del taller</Label>
            <Input
              id="tenant-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Taller El Turco"
              required
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear taller"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tenants, setTenants] = useState<TenantResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getTenants();
      setTenants(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error al cargar talleres: ${msg}`);
      console.error("getTenants error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleTenantCreated = (tenant: TenantResponse) => {
    setTenants((prev) => [tenant, ...prev]);
  };

  const handleTenantToggled = (id: string) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t))
    );
  };

  const active = tenants.filter((t) => t.isActive).length;
  const total = tenants.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Talleres</h1>
          <p className="text-sm text-gray-500 mt-1">
            {active} activo{active !== 1 ? "s" : ""} de {total} en total
          </p>
        </div>
        <CreateTenantDialog onCreated={handleTenantCreated} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Todos los talleres</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando...
            </div>
          ) : tenants.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              No hay talleres registrados. Creá el primero.
            </div>
          ) : (
            <div className="space-y-2">
              {tenants.map((tenant) => (
                <TenantRow
                  key={tenant.id}
                  tenant={tenant}
                  onToggle={() => handleTenantToggled(tenant.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
