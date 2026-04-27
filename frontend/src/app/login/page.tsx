"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MecaFlowLogo } from "@/components/MecaFlowLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        toast.error("Usuario o contraseña incorrectos");
        return;
      }
      router.push("/");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-3/5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex-col justify-between p-12">
        <MecaFlowLogo dark />

        <div className="space-y-6">
          <h1 className="text-white text-5xl font-bold leading-tight">
            Tu taller,<br />
            sin el caos<br />
            del papel.
          </h1>
          <p className="text-slate-400 text-lg max-w-sm leading-relaxed">
            Gestioná órdenes de servicio, clientes y vehículos desde un solo lugar. Rápido, simple y desde el celular.
          </p>
        </div>

        <div className="flex gap-8">
          {[
            { value: "100%", label: "Digital" },
            { value: "0", label: "Papeles" },
            { value: "∞", label: "Órdenes" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-white text-2xl font-bold">{stat.value}</div>
              <div className="text-slate-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex lg:hidden mb-8">
            <MecaFlowLogo />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bienvenido</h2>
            <p className="text-gray-500 mt-1 text-sm">Iniciá sesión en tu taller</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ingresando...
                </>
              ) : (
                "Ingresar"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400">
            MecaFlow © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
