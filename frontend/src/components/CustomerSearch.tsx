"use client";

import { useState, useEffect, useRef } from "react";
import { customersApi } from "@/lib/api";
import type { Customer, CreateCustomerDto } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { UserPlus, Check, Search } from "lucide-react";
import { toast } from "sonner";

interface Props {
  selected: Customer | null;
  onSelect: (c: Customer) => void;
}

export function CustomerSearch({ selected, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateCustomerDto>({ name: "", phone: "", email: "" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await customersApi.getAll(query);
        setResults(data);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleCreate = async () => {
    if (!form.name || !form.phone) return;
    setCreating(true);
    try {
      const customer = await customersApi.create({ ...form, email: form.email || undefined });
      toast.success("Cliente creado");
      onSelect(customer);
      setShowCreate(false);
      setQuery("");
    } catch {
      toast.error("Error al crear cliente");
    } finally {
      setCreating(false);
    }
  };

  if (selected) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <div>
            <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
            <p className="text-xs text-gray-500">{selected.phone}{selected.email ? ` · ${selected.email}` : ""}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onSelect(null as unknown as Customer)}>
          Cambiar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar cliente por nombre o teléfono..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {results.length > 0 && (
        <Card className="divide-y">
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => { onSelect(c); setQuery(""); setResults([]); }}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-500">{c.phone}{c.email ? ` · ${c.email}` : ""}</p>
              </div>
              <span className="text-xs text-gray-400">{c.vehicleCount} vehículo{c.vehicleCount !== 1 ? "s" : ""}</span>
            </button>
          ))}
        </Card>
      )}

      {query.length >= 2 && results.length === 0 && (
        <p className="text-sm text-gray-500 px-1">No se encontraron clientes.</p>
      )}

      {!showCreate ? (
        <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Crear nuevo cliente
        </Button>
      ) : (
        <Card className="p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Nuevo cliente</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Juan García" />
            </div>
            <div className="space-y-1">
              <Label>Teléfono *</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+54 11 1234-5678" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="juan@email.com" type="email" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={creating || !form.name || !form.phone}>
              {creating ? "Guardando..." : "Guardar cliente"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
