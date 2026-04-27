"use client";

import { useState, useEffect } from "react";
import { vehiclesApi } from "@/lib/api";
import type { Vehicle, Customer, CreateVehicleDto } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Car, Check, PlusCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  customer: Customer;
  selected: Vehicle | null;
  onSelect: (v: Vehicle) => void;
}

const CURRENT_YEAR = new Date().getFullYear();

export function VehicleSelect({ customer, selected, onSelect }: Props) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<CreateVehicleDto, "customerId">>({
    licensePlate: "", brand: "", model: "", year: CURRENT_YEAR, color: "", notes: "",
  });

  useEffect(() => {
    vehiclesApi.getAll({ customerId: customer.id }).then(setVehicles).catch(() => setVehicles([]));
  }, [customer.id]);

  const handleCreate = async () => {
    if (!form.licensePlate || !form.brand || !form.model) return;
    setCreating(true);
    try {
      const vehicle = await vehiclesApi.create({
        ...form,
        customerId: customer.id,
        color: form.color || undefined,
        notes: form.notes || undefined,
      });
      toast.success("Vehículo creado");
      setVehicles((prev) => [...prev, vehicle]);
      onSelect(vehicle);
      setShowCreate(false);
    } catch {
      toast.error("Error al crear vehículo");
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
            <p className="text-sm font-semibold text-gray-900">
              {selected.licensePlate} — {selected.brand} {selected.model} {selected.year}
            </p>
            {selected.color && <p className="text-xs text-gray-500">{selected.color}</p>}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onSelect(null as unknown as Vehicle)}>
          Cambiar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {vehicles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {vehicles.map((v) => (
            <button
              key={v.id}
              onClick={() => onSelect(v)}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 text-left transition-colors"
            >
              <Car className="h-5 w-5 text-gray-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold font-mono">{v.licensePlate}</p>
                <p className="text-xs text-gray-500">{v.brand} {v.model} {v.year}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Este cliente no tiene vehículos registrados.</p>
      )}

      {!showCreate ? (
        <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
          <PlusCircle className="h-4 w-4 mr-2" /> Agregar vehículo
        </Button>
      ) : (
        <Card className="p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Nuevo vehículo</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Placa *</Label>
              <Input
                value={form.licensePlate}
                onChange={(e) => setForm({ ...form, licensePlate: e.target.value.toUpperCase() })}
                placeholder="ABC 123"
                className="font-mono uppercase"
              />
            </div>
            <div className="space-y-1">
              <Label>Marca *</Label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Toyota" />
            </div>
            <div className="space-y-1">
              <Label>Modelo *</Label>
              <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Corolla" />
            </div>
            <div className="space-y-1">
              <Label>Año *</Label>
              <Input
                type="number"
                min={1900}
                max={CURRENT_YEAR + 1}
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Blanco" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notas</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="GNC, automático..." />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={creating || !form.licensePlate || !form.brand || !form.model}>
              {creating ? "Guardando..." : "Guardar vehículo"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
