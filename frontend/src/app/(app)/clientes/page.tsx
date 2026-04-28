"use client";

import { useEffect, useState, useCallback } from "react";
import { customersApi } from "@/lib/api";
import type { Customer, CreateCustomerDto } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { exportCustomersToExcel } from "@/lib/export-data";

const emptyForm = (): CreateCustomerDto => ({ name: "", phone: "", email: "" });

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CreateCustomerDto>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      setCustomers(await customersApi.getAll(search || undefined));
    } catch {
      toast.error("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, email: c.email ?? "" });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.phone) return;
    setSaving(true);
    try {
      const dto = { ...form, email: form.email || undefined };
      if (editing) {
        await customersApi.update(editing.id, dto);
        toast.success("Cliente actualizado");
      } else {
        await customersApi.create(dto);
        toast.success("Cliente creado");
      }
      setOpen(false);
      load();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await customersApi.delete(deleteTarget.id);
      toast.success("Cliente eliminado");
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  // ── Selection ──────────────────────────────────────────────────────────────
  const allIds = customers.map((c) => c.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = allIds.some((id) => selected.has(id));
  const selectedCount = allIds.filter((id) => selected.has(id)).length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const toExport = someSelected ? customers.filter((c) => selected.has(c.id)) : customers;
    if (!toExport.length) return;
    exportCustomersToExcel(toExport, `clientes-${Date.now()}.xlsx`);
    toast.success(`${toExport.length} cliente${toExport.length !== 1 ? "s" : ""} exportado${toExport.length !== 1 ? "s" : ""}`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">{customers.length} registrados</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo Cliente
            </Button>
          } />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-1">
                <Label required>Nombre</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Juan García" />
              </div>
              <div className="space-y-1">
                <Label required>Teléfono</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+54 11 1234-5678" />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="juan@email.com" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
              <Button onClick={handleSave} disabled={saving || !form.name || !form.phone}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base font-semibold">Listado</CardTitle>
            {customers.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50">
                <FileSpreadsheet className="h-4 w-4" />
                {someSelected ? `Exportar ${selectedCount} seleccionado${selectedCount !== 1 ? "s" : ""}` : `Exportar todos (${customers.length})`}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>
          ) : customers.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Users className="h-8 w-8 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-400">No hay clientes{search ? " que coincidan" : ""}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                        aria-label="Seleccionar todos"
                      />
                    </TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Vehículos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id} className={`hover:bg-gray-50 ${selected.has(c.id) ? "bg-blue-50/60" : ""}`}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggleOne(c.id)}
                          className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                          aria-label={`Seleccionar ${c.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm text-gray-600">{c.phone}</TableCell>
                      <TableCell className="text-sm text-gray-500">{c.email ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                          {c.vehicleCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon-sm"
                            onClick={() => setDeleteTarget(c)}
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

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar cliente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            ¿Estás seguro de eliminar a <span className="font-semibold">{deleteTarget?.name}</span>?
            Se eliminarán también sus vehículos e historial de órdenes.
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
