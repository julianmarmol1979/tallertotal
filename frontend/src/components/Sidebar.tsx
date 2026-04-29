"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Users, Car, ClipboardList, Wrench, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { MecaFlowLogo } from "@/components/MecaFlowLogo";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ordenes", label: "Órdenes de Servicio", icon: ClipboardList },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/vehiculos", label: "Vehículos", icon: Car },
  { href: "/mecanicos", label: "Mecánicos", icon: Wrench },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [tenantName, setTenantName] = useState("");

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)mecaflow_tenant=([^;]*)/);
    if (match) setTenantName(decodeURIComponent(match[1]));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
      <div className="p-5 border-b border-slate-800">
        <MecaFlowLogo dark />
        {tenantName && (
          <p className="mt-1.5 text-xs text-slate-500 truncate">
            <span className="text-slate-400 font-medium">Taller:</span> {tenantName}
          </p>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
