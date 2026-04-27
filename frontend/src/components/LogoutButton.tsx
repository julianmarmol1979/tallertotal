"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500 hover:text-red-600">
      <LogOut className="h-4 w-4 mr-1.5" />
      Salir
    </Button>
  );
}
