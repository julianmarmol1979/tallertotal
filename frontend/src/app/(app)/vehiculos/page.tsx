"use client";

import { useEffect, useState, useCallback } from "react";
import { vehiclesApi, customersApi } from "@/lib/api";
import type { Vehicle, Customer, CreateVehicleDto } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Car, Search } from "lucide-react";
import { toast } from "sonner";

// ── Constants ─────────────────────────────────────────────────────────────────

const BRANDS = [
  "Acura", "Alfa Romeo", "BYD", "Chery", "Chevrolet", "Citroën", "DS",
  "Fiat", "Ford", "Geely", "Honda", "Hyundai", "Jeep", "Kia", "Lifan",
  "Maserati", "Mercedes-Benz", "MG", "Mini", "Mitsubishi", "Nissan",
  "Peugeot", "Ram", "Renault", "Subaru", "Suzuki", "Toyota", "Volkswagen",
  "Volvo", "ZNA", "Otro",
];

const COLORS = [
  "Blanco", "Negro", "Gris", "Plateado", "Rojo", "Azul", "Azul Marino",
  "Verde", "Amarillo", "Naranja", "Marrón", "Beige", "Celeste", "Bordó",
  "Arena", "Otro",
];

const OTHER = "Otro";
const CURRENT_YEAR = new Date().getFullYear();

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns select value: the item itself if in list, "Otro" if custom, "" if empty */
function selectValueFor(value: string, list: string[]) {
  if (!value) return "";
  return list.includes(value) ? value : OTHER;
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  customerId: string;
  licensePlate: string;
  brandSelect: string;
  brandCustom: string;
  model: string;
  year: number;
  colorSelect: string;
  colorCustom: string;
  notes: string;
}

const emptyForm = (): FormState => ({
  customerId: "", licensePlate: "", brandSelect: "", brandCustom: "",
  model: "", year: CURRENT_YEAR, colorSelect: "", colorCustom: "", notes: "",
});

function formToDto(form: FormState): Omit<CreateVehicleDto, "customerId"> & { customerId: string } {
  return {
    customerId: form.customerId,
    licensePlate: form.licensePlate,
    brand: form.brandSelect === OTHER ? form.brandCustom : form.brandSelect,
    model: form.model,
    year: form.year,
    color: (form.colorSelect === OTHER ? form.colorCustom : form.colorSelect) || undefined,
    notes: form.notes || undefined,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VehiculosPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [plateSearch, setPlateSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVehicles(await vehiclesApi.getAll(plateSearch ? { plate: plateSearch } : undefined));
    } catch {
      toast.error("Error al cargar vehículos");
    } finally {
      setLoading(false);
    }
  }, [plateSearch]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    customersApi.getAll(customerSearch || undefined).then(setCustomers).catch(() => {});
  }, [customerSearch]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setCustomerSearch("");
    setOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditing(v);
    const brandSel = selectValueFor(v.brand, BRANDS);
    const colorSel = selectValueFor(v.color ?? "", COLORS);
    setForm({
      customerId: v.customerId,
      licensePlate: v.licensePlate,
      brandSelect: brandSel,
      brandCustom: brandSel === OTHER ? v.brand : "",
      model: v.model,
      year: v.year,
      colorSelect: colorSel,
      colorCustom: colorSel === OTHER ? (v.color ?? "") : "",
      notes: v.notes ?? "",
    });
    setCustomerSearch("");
    setOpen(true);
  };

  const handleSave = async () => {
    const dto = formToDto(form);
    if (!dto.customerId || !dto.licensePlate || !dto.brand || !dto.model) return;
    setSaving(true);
    try {
      if (editing) {
        await vehiclesApi.create(dto);
        toast.success("Vehículo actualizado");
      } else {
        await vehiclesApi.create(dto);
        toast.success("Vehículo creado");
      }
      setOpen(false);
      load();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = customers.filter((c) =>
    !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await vehiclesApi.delete(deleteTarget.id);
      toast.success("Vehículo eliminado");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar vehículo");
    } finally {
      setDeleting(false);
    }
  };

  const dto = formToDto(form);
  const canSave = !!dto.customerId && !!dto.licensePlate && !!dto.brand && !!dto.model;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
          <p className="text-sm text-gray-500 mt-1">{vehicles.length} registrados</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo Vehículo
            </Button>
          } />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar vehículo" : "Nuevo vehículo"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">

              {/* Customer selector */}
              <div className="space-y-1">
                <Label required>Cliente</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-8 text-sm"
                  />
                </div>
                {form.customerId && (
                  <p className="text-xs text-green-700 font-medium pl-1">
                    ✓ {customers.find((c) => c.id === form.customerId)?.name ?? "Seleccionado"}
                  </p>
                )}
                {customerSearch && filteredCustomers.length > 0 && !form.customerId && (
                  <Card className="divide-y max-h-36 overflow-y-auto">
                    {filteredCustomers.slice(0, 6).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setForm({ ...form, customerId: c.id }); setCustomerSearch(c.name); }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-gray-400 ml-2">{c.phone}</span>
                      </button>
                    ))}
                  </Card>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Placa */}
                <div className="space-y-1">
                  <Label required>Placa</Label>
                  <Input
                    value={form.licensePlate}
                    onChange={(e) => setForm({ ...form, licensePlate: e.target.value.toUpperCase() })}
                    placeholder="ABC 123"
                    className="font-mono uppercase"
                  />
                </div>

                {/* Año */}
                <div className="space-y-1">
                  <Label required>Año</Label>
                  <Input
                    type="number" min={1900} max={CURRENT_YEAR + 1}
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                  />
                </div>

                {/* Marca */}
                <div className="space-y-1">
                  <Label required>Marca</Label>
                  <Select
                    value={form.brandSelect}
                    onValueChange={(v) => v && setForm({ ...form, brandSelect: v, brandCustom: "" })}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {form.brandSelect === OTHER && (
                    <Input
                      value={form.brandCustom}
                      onChange={(e) => setForm({ ...form, brandCustom: e.target.value })}
                      placeholder="Escribí la marca..."
                      autoFocus
                    />
                  )}
                </div>

                {/* Modelo */}
                <div className="space-y-1">
                  <Label required>Modelo</Label>
                  <Input
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    placeholder="Corolla"
                  />
                </div>

                {/* Color */}
                <div className="space-y-1">
                  <Label>Color</Label>
                  <Select
                    value={form.colorSelect}
                    onValueChange={(v) => v && setForm({ ...form, colorSelect: v, colorCustom: "" })}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {COLORS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {form.colorSelect === OTHER && (
                    <Input
                      value={form.colorCustom}
                      onChange={(e) => setForm({ ...form, colorCustom: e.target.value })}
                      placeholder="Escribí el color..."
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-1">
                <Label>Notas</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="GNC, automático, diésel..."
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
              <Button onClick={handleSave} disabled={saving || !canSave}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Listado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Buscar por placa..."
            value={plateSearch}
            onChange={(e) => setPlateSearch(e.target.value.toUpperCase())}
            className="max-w-xs font-mono"
          />

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>
          ) : vehicles.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Car className="h-8 w-8 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-400">No hay vehículos{plateSearch ? " con esa placa" : ""}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Placa</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((v) => (
                    <TableRow key={v.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono font-bold text-sm">{v.licensePlate}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{v.brand} {v.model}</div>
                        <div className="text-xs text-gray-400">{v.year}</div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{v.color ?? "—"}</TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-blue-700">{v.customerName}</span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500 max-w-[140px] truncate">{v.notes ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(v)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon-sm"
                            onClick={() => setDeleteTarget(v)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar vehículo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            ¿Eliminar <span className="font-semibold">{deleteTarget?.licensePlate} — {deleteTarget?.brand} {deleteTarget?.model}</span>?
            Se eliminarán también sus órdenes de servicio.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminando..." : "Sí, eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
