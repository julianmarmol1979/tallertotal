"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
import {
  Plus, ChevronDown, ChevronRight, Loader2, Trash2, Power,
  Wifi, WifiOff, Send, QrCode, RefreshCw, Building2, Plug,
} from "lucide-react";
import {
  adminApi,
  type TenantResponse,
  type UserResponse,
  type WhatsAppStatusResponse,
  type WhatsAppQrResponse,
  type PushStatusResponse,
} from "@/lib/api";

// ── Tenant row ────────────────────────────────────────────────────────────────

function TenantRow({ tenant, onToggle }: { tenant: TenantResponse; onToggle: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [toggling, setToggling] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      setUsers(await adminApi.getUsers(tenant.id));
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

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={handleExpand}
          className="text-gray-400 hover:text-gray-600 transition-colors"
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
            variant="ghost" size="sm" onClick={handleToggle} disabled={toggling}
            className={tenant.isActive ? "text-gray-500 hover:text-red-600" : "text-gray-500 hover:text-green-600"}
          >
            {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
            <span className="hidden sm:inline ml-1.5">{tenant.isActive ? "Desactivar" : "Activar"}</span>
          </Button>
          <CreateUserDialog tenantId={tenant.id} onCreated={(u) => setUsers((p) => [...p, u])} />
        </div>
      </div>

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

function CreateUserDialog({ tenantId, onCreated }: { tenantId: string; onCreated: (u: UserResponse) => void }) {
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
      <DialogTrigger render={<Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Usuario</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo usuario</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="nu-username" required>Usuario</Label>
            <Input id="nu-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="juan" required autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nu-password" required>Contraseña</Label>
            <PasswordInput id="nu-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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

function CreateTenantDialog({ onCreated }: { onCreated: (t: TenantResponse) => void }) {
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
      <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-2" />Nuevo taller</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo taller</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="tenant-name" required>Nombre del taller</Label>
            <Input id="tenant-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Taller El Turco" required autoFocus />
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

// ── Talleres tab ──────────────────────────────────────────────────────────────

function TalleresTab() {
  const [tenants, setTenants] = useState<TenantResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTenants(await adminApi.getTenants()); }
    catch { toast.error("No se pudo cargar la lista de talleres"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = tenants.filter((t) => t.isActive).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-gray-500">
          {active} activo{active !== 1 ? "s" : ""} de {tenants.length} en total
        </p>
        <CreateTenantDialog onCreated={(t) => setTenants((p) => [t, ...p])} />
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
        </div>
      ) : tenants.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          No hay talleres registrados. Creá el primero.
        </div>
      ) : (
        <div className="space-y-2">
          {tenants.map((tenant) => (
            <TenantRow
              key={tenant.id}
              tenant={tenant}
              onToggle={() => setTenants((p) => p.map((t) => t.id === tenant.id ? { ...t, isActive: !t.isActive } : t))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── WhatsApp card ─────────────────────────────────────────────────────────────

function WhatsAppCard() {
  const [status, setStatus] = useState<WhatsAppStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [qr, setQr] = useState<WhatsAppQrResponse | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(0);
  const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopQrTimer = () => {
    if (qrTimerRef.current) { clearInterval(qrTimerRef.current); qrTimerRef.current = null; }
  };

  const checkStatus = useCallback(async () => {
    setLoading(true); setQr(null); stopQrTimer(); setQrCountdown(0);
    try { setStatus(await adminApi.getWhatsAppStatus()); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Error al verificar"); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchQr = useCallback(async () => {
    setLoadingQr(true);
    try {
      const result = await adminApi.getWhatsAppQr();
      setQr(result);
      if (result.isAlreadyConnected) {
        toast.success("¡Ya está conectado!");
        stopQrTimer(); setQrCountdown(0);
        await checkStatus();
      } else if (result.qrBase64) {
        setQrCountdown(18);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al obtener QR");
    } finally {
      setLoadingQr(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkStatus]);

  useEffect(() => {
    if (qrCountdown <= 0) return;
    const t = setTimeout(() => setQrCountdown((c) => { if (c <= 1) { fetchQr(); return 0; } return c - 1; }), 1000);
    return () => clearTimeout(t);
  }, [qrCountdown, fetchQr]);

  useEffect(() => () => stopQrTimer(), []);

  const connected = status?.connectionState?.toLowerCase() === "open";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="text-xl">💬</span> WhatsApp
          </CardTitle>
          <Button size="sm" variant="outline" onClick={checkStatus} disabled={loading} className="h-7 text-xs gap-1">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Verificar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!status ? (
          <p className="text-gray-400 text-xs">Hacé clic en "Verificar" para ver el estado.</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {connected
                ? <><Wifi className="h-4 w-4 text-green-500" /><span className="text-green-700 font-medium">Conectado</span></>
                : <><WifiOff className="h-4 w-4 text-red-400" /><span className="text-red-600 font-medium">Desconectado</span></>}
              {status.connectionState && (
                <span className="text-gray-400 font-mono text-xs">({status.connectionState})</span>
              )}
            </div>

            {!status.isConfigured && (
              <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700 space-y-0.5">
                <p className="font-semibold">Variables faltantes en Railway:</p>
                <p className="font-mono">Evolution__BaseUrl · Evolution__ApiKey · Evolution__Instance</p>
              </div>
            )}

            {status.error && (
              <div className="text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 font-mono break-all">
                {status.error}
              </div>
            )}

            {status.isConfigured && !connected && (
              <div className="space-y-2 pt-1 border-t">
                <p className="text-xs text-amber-600 font-medium">⚠️ Sesión desconectada — re-escanear QR</p>
                <Button size="sm" variant="outline" onClick={fetchQr} disabled={loadingQr} className="gap-1.5 h-8 text-xs">
                  {loadingQr ? <Loader2 className="h-3 w-3 animate-spin" /> : <QrCode className="h-3 w-3" />}
                  Mostrar QR
                </Button>
                {qr?.qrBase64 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">WhatsApp → ⋮ → <strong>Dispositivos vinculados</strong> → <strong>Vincular dispositivo</strong></p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qr.qrBase64} alt="QR WhatsApp" className="w-56 h-56 border-2 border-gray-200 rounded-xl" />
                    <div className="flex items-center gap-2">
                      {qrCountdown > 0
                        ? <span className="text-xs text-amber-600">Actualizando en {qrCountdown}s…</span>
                        : <Button size="sm" variant="outline" onClick={fetchQr} disabled={loadingQr} className="h-7 text-xs gap-1"><RefreshCw className="h-3 w-3" />Nuevo QR</Button>}
                      <Button size="sm" variant="outline" onClick={checkStatus} disabled={loading} className="h-7 text-xs gap-1 text-green-700 border-green-300">
                        <RefreshCw className="h-3 w-3" />Verificar
                      </Button>
                    </div>
                  </div>
                )}
                {qr?.error && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{qr.error}</p>}
              </div>
            )}

            {status.isConfigured && connected && (
              <div className="space-y-2 pt-1 border-t">
                <p className="text-xs text-gray-500 font-medium">Mensaje de prueba</p>
                <div className="flex gap-2">
                  <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+54 9 291 414-1049" className="text-xs h-8" />
                  <Button size="sm" onClick={async () => { setTesting(true); try { await adminApi.testWhatsApp(testPhone.trim()); toast.success("Enviado ✓"); } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); } finally { setTesting(false); } }} disabled={testing || !testPhone.trim()} className="h-8">
                    {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Push card ─────────────────────────────────────────────────────────────────

function PushCard() {
  const [status, setStatus] = useState<PushStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setStatus(await adminApi.getPushStatus()); }
    catch { toast.error("No se pudo verificar Push"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="text-xl">🔔</span> Push (VAPID)
          </CardTitle>
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="h-7 text-xs gap-1">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {loading && !status ? (
          <p className="text-xs text-gray-400">Verificando…</p>
        ) : status ? (
          <>
            <div className="flex items-center gap-2">
              {status.isConfigured
                ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">✅ Configurado</Badge>
                : <Badge variant="destructive" className="text-xs">❌ No configurado</Badge>}
              {status.publicKeyPreview && (
                <span className="text-gray-400 font-mono text-xs">{status.publicKeyPreview}</span>
              )}
            </div>

            {/* Diagnostic: what the backend actually sees */}
            {(status.foundInEnv?.length ?? 0) > 0 || (status.foundInConfig?.length ?? 0) > 0 ? (
              <div className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 space-y-1">
                <p className="font-semibold text-gray-600">Variables detectadas por el backend:</p>
                {(status.foundInConfig ?? []).map((k) => (
                  <p key={k} className="font-mono text-gray-500">config[{k}] ✓</p>
                ))}
                {(status.foundInEnv ?? []).map((k) => (
                  <p key={k} className="font-mono text-gray-500">env[{k}] ✓</p>
                ))}
              </div>
            ) : !status.isConfigured ? (
              <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700 space-y-1">
                <p className="font-semibold">El backend no encuentra ninguna variable VAPID.</p>
                <p>Agregá en Railway (nombre simple, sin puntos ni guiones dobles):</p>
                <p className="font-mono">VAPID_PUBLIC_KEY</p>
                <p className="font-mono">VAPID_PRIVATE_KEY</p>
              </div>
            ) : null}

            {status.isConfigured && (
              <div className="text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-700 space-y-1">
                <p className="font-semibold">También verificar en Vercel:</p>
                <p><span className="font-mono">NEXT_PUBLIC_VAPID_PUBLIC_KEY</span> debe coincidir con la public key de Railway.</p>
                <p className="text-blue-600">Si cambiaste la clave, reactivar notificaciones desde el link del mecánico.</p>
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ── Integraciones tab ─────────────────────────────────────────────────────────

function IntegracionesTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <WhatsAppCard />
      <PushCard />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "talleres" | "integraciones";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "talleres",      label: "Talleres",      icon: <Building2 className="h-4 w-4" /> },
  { key: "integraciones", label: "Integraciones", icon: <Plug className="h-4 w-4" /> },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("talleres");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
        <p className="text-sm text-gray-500 mt-1">Panel de control del sistema</p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "talleres"      && <TalleresTab />}
      {tab === "integraciones" && <IntegracionesTab />}
    </div>
  );
}
