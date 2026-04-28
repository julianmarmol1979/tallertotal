"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { serviceOrdersApi, mechanicsApi } from "@/lib/api";
import type { Customer, Vehicle, CreateServiceItemDto, Mechanic } from "@/types";
import { CustomerSearch } from "@/components/CustomerSearch";
import { VehicleSelect } from "@/components/VehicleSelect";
import { ServiceItemsForm } from "@/components/ServiceItemsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS = ["Cliente", "Vehículo", "Orden"];

export default function NuevaOrdenPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [mileageIn, setMileageIn] = useState("");
  const [assignedMechanic, setAssignedMechanic] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [estimatedDeliveryAt, setEstimatedDeliveryAt] = useState("");
  const [items, setItems] = useState<CreateServiceItemDto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);

  useEffect(() => {
    mechanicsApi.getAll(true).then(setMechanics).catch(() => {});
  }, []);

  const handleSelectCustomer = (c: Customer) => {
    setCustomer(c);
    setVehicle(null);
    if (c) setStep(1);
  };

  const handleSelectVehicle = (v: Vehicle) => {
    setVehicle(v);
    if (v) setStep(2);
  };

  const handleSubmit = async () => {
    if (!vehicle) return;
    setSubmitting(true);
    try {
      await serviceOrdersApi.create({
        vehicleId: vehicle.id,
        diagnosisNotes: diagnosisNotes || undefined,
        mileageIn: mileageIn ? Number(mileageIn) : undefined,
        assignedMechanic: assignedMechanic || undefined,
        internalNotes: internalNotes || undefined,
        estimatedDeliveryAt: estimatedDeliveryAt || undefined,
        items,
      });
      toast.success("Orden creada correctamente");
      router.push("/ordenes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear la orden");
      setSubmitting(false);
    }
  };

  const canAdvance = [
    !!customer,
    !!vehicle,
    true,
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/ordenes" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Orden de Servicio</h1>
          <p className="text-sm text-gray-500 mt-0.5">Completá los pasos para registrar el trabajo</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => canAdvance.slice(0, i).every(Boolean) && setStep(i)}
              className="flex items-center gap-2 group"
            >
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                i < step
                  ? "bg-green-500 border-green-500 text-white"
                  : i === step
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-gray-300 text-gray-400"
              )}>
                {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn(
                "text-sm font-medium hidden sm:block",
                i === step ? "text-blue-700" : i < step ? "text-green-600" : "text-gray-400"
              )}>
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn("flex-1 h-0.5 mx-3", i < step ? "bg-green-400" : "bg-gray-200")} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 — Cliente */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Seleccioná el cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerSearch selected={customer} onSelect={handleSelectCustomer} />
            {customer && (
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setStep(1)}>Continuar</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 1 — Vehículo */}
      {step === 1 && customer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Seleccioná el vehículo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-3">
              Cliente: <span className="font-medium text-gray-700">{customer.name}</span>
            </p>
            <VehicleSelect customer={customer} selected={vehicle} onSelect={handleSelectVehicle} />
            {vehicle && (
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setStep(2)}>Continuar</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Orden */}
      {step === 2 && vehicle && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Detalle de la orden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-0.5">
              <p><span className="text-gray-500">Cliente:</span> <span className="font-medium">{customer?.name}</span></p>
              <p><span className="text-gray-500">Vehículo:</span> <span className="font-medium font-mono">{vehicle.licensePlate}</span> — {vehicle.brand} {vehicle.model} {vehicle.year}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Fecha estimada de entrega</Label>
                <Input
                  type="date"
                  value={estimatedDeliveryAt}
                  onChange={(e) => setEstimatedDeliveryAt(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Mecánico asignado</Label>
                {mechanics.length > 0 ? (
                  <select
                    value={assignedMechanic}
                    onChange={(e) => setAssignedMechanic(e.target.value)}
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring/50"
                  >
                    <option value="">Sin asignar</option>
                    {mechanics.map((m) => (
                      <option key={m.id} value={m.name}>{m.name}{m.specialty ? ` — ${m.specialty}` : ""}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={assignedMechanic}
                    onChange={(e) => setAssignedMechanic(e.target.value)}
                    placeholder="Nombre del mecánico"
                  />
                )}
              </div>
              <div className="space-y-1">
                <Label>Kilometraje de entrada</Label>
                <Input
                  type="number"
                  min={0}
                  value={mileageIn}
                  onChange={(e) => setMileageIn(e.target.value)}
                  placeholder="Ej: 85000"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Diagnóstico / Notas</Label>
              <Textarea
                value={diagnosisNotes}
                onChange={(e) => setDiagnosisNotes(e.target.value)}
                placeholder="Describe el problema o trabajo a realizar..."
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <Label>Notas internas</Label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Notas visibles solo para el taller (no se envían al cliente)..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Items de servicio</Label>
              <ServiceItemsForm items={items} onChange={setItems} />
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Creando..." : "Crear Orden"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
