"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { TallerTotalLogo } from "@/components/TallerTotalLogo";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = isAdmin
        ? { password }
        : { username, password };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        toast.error("Usuario o contraseña incorrectos");
        return;
      }

      const data = await res.json();
      router.push(data.role === "SuperAdmin" ? "/admin" : "/");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-3/5 relative flex-col justify-between p-12 overflow-hidden">
        <Image
          src="/background.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-slate-900/70" />
        <div className="relative z-10">
          <TallerTotalLogo dark />
        </div>
        <div className="relative z-10 space-y-6">
          <h1 className="text-white text-5xl font-bold leading-tight">
            Tu taller,<br />
            sin el caos<br />
            del papel.
          </h1>
          <p className="text-slate-300 text-lg max-w-sm leading-relaxed">
            Gestioná órdenes de servicio, clientes y vehículos desde un solo lugar. Rápido, simple y desde el celular.
          </p>
        </div>
        <div className="relative z-10 flex gap-8">
          {[{ value: "100%", label: "Digital" }, { value: "0", label: "Papeles" }, { value: "∞", label: "Órdenes" }].map((s) => (
            <div key={s.label}>
              <div className="text-white text-2xl font-bold">{s.value}</div>
              <div className="text-slate-400 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex lg:hidden mb-8">
            <TallerTotalLogo />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bienvenido</h2>
            <p className="text-gray-500 mt-1 text-sm">
              {isAdmin ? "Acceso de administrador" : "Iniciá sesión en tu taller"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isAdmin && (
              <div className="space-y-1.5">
                <Label htmlFor="username" required>Usuario</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="usuario"
                  required
                  autoComplete="username"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="password" required>Contraseña</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Ingresando...</> : "Ingresar"}
            </Button>
          </form>

          <button
            onClick={() => { setIsAdmin(!isAdmin); setUsername(""); setPassword(""); }}
            className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isAdmin ? "← Volver al login de taller" : "Acceso administrador"}
          </button>

          <p className="text-center text-xs text-gray-400">TallerTotal © {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
