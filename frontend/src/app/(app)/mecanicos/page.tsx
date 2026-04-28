"use client";

import { useEffect, useState, useCallback } from "react";
import { mechanicsApi } from "@/lib/api";
import type { Mechanic, CreateMechanicDto } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Wrench, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

// ── Form state ─────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  phone: string;
  specialty: string;
}

const emptyForm = (): FormState => ({ name: "", phone: "", specialty: "" });

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MecanicosPage() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Mechanic | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Mechanic | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMechanics(await mechanicsApi.getAll());
    } catch {
      toast.error("Error al cargar mecánicos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (m: Mechanic) => {
    setEditing(m);
    setForm({ name: m.name, phone: m.phone ?? "", specialty: m.specialty ?? "" });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const dto: CreateMechanicDto = {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      specialty: form.specialty.trim() || undefined,
    };
    setSaving(true);
    try {
      if (editing) {
        await mechanicsApi.update(editing.id, dto);
        toast.success("Mecánico actualizado");
      } else {
        await mechanicsApi.create(dto);
        toast.success("Mecánico creado");
      }
      setOpen(false);
      load();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (m: Mechanic) => {
    try {
      await mechanicsApi.toggle(m.id);
      toast.success(m.isActive ? "Mecánico desactivado" : "Mecánico activado");
      load();
    } catch {
      toast.error("Error al cambiar estado");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await mechanicsApi.delete(deleteTarget.id);
      toast.success("Mecánico eliminado");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = mechanics.filter((m) => m.isActive).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mecánicos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeCount} activo{activeCount !== 1 ? "s" : ""} de {mechanics.length}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo Mecánico
            </Button>
          } />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar mecánico" : "Nuevo mecánico"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-1">
                <Label required>Nombre</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Juan Pérez"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label>Teléfono</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+54 9 291 555-0000"
                />
              </div>
              <div className="space-y-1">
                <Label>Especialidad</Label>
                <Input
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  placeholder="Motor, frenos, electricidad..."
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
              <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
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
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>
          ) : mechanics.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Wrench className="h-8 w-8 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-400">No hay mecánicos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Especialidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mechanics.map((m) => (
                    <TableRow key={m.id} className={`hover:bg-gray-50 ${!m.isActive ? "opacity-50" : ""}`}>
                      <TableCell className="font-medium text-sm">{m.name}</TableCell>
                      <TableCell className="text-sm text-gray-600">{m.phone ?? "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{m.specialty ?? "—"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {m.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon-sm"
                            onClick={() => handleToggle(m)}
                            title={m.isActive ? "Desactivar" : "Activar"}
                            className="text-gray-400 hover:text-blue-600"
                          >
                            {m.isActive
                              ? <ToggleRight className="h-3.5 w-3.5" />
                              : <ToggleLeft className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(m)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon-sm"
                            onClick={() => setDeleteTarget(m)}
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
            <DialogTitle>Eliminar mecánico</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            ¿Eliminar a <span className="font-semibold">{deleteTarget?.name}</span>?
            Esta acción no se puede deshacer.
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
