"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CreateServiceItemDto, ServiceItemType } from "@/types";
import { PlusCircle, Trash2 } from "lucide-react";

interface Props {
  items: CreateServiceItemDto[];
  onChange: (items: CreateServiceItemDto[]) => void;
}

const emptyItem = (): CreateServiceItemDto => ({
  description: "",
  type: "Labor",
  quantity: 1,
  unitPrice: 0,
});

export function ServiceItemsForm({ items, onChange }: Props) {
  const add = () => onChange([...items, emptyItem()]);

  const update = (index: number, patch: Partial<CreateServiceItemDto>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">No hay items. Agregá mano de obra o repuestos.</p>
      ) : (
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-12 gap-2 px-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span className="col-span-5">Descripción</span>
            <span className="col-span-2">Tipo</span>
            <span className="col-span-1 text-right">Cant.</span>
            <span className="col-span-2 text-right">P. Unitario</span>
            <span className="col-span-1 text-right">Total</span>
            <span className="col-span-1" />
          </div>

          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12 sm:col-span-5">
                <Input
                  placeholder="Ej: Cambio de aceite, Filtro de aire..."
                  value={item.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="col-span-5 sm:col-span-2">
                <Select
                  value={item.type}
                  onValueChange={(v) => update(i, { type: v as ServiceItemType })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Labor">Mano de obra</SelectItem>
                    <SelectItem value="Part">Repuesto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3 sm:col-span-1">
                <Input
                  type="number"
                  min={0.01}
                  step={0.5}
                  value={item.quantity}
                  onChange={(e) => update(i, { quantity: Number(e.target.value) })}
                  className="text-sm text-right"
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={item.unitPrice}
                  onChange={(e) => update(i, { unitPrice: Number(e.target.value) })}
                  className="text-sm text-right"
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-5 sm:col-span-1 text-right text-sm font-medium text-gray-700 pr-1">
                ${(item.quantity * item.unitPrice).toLocaleString("es-AR", { minimumFractionDigits: 0 })}
              </div>
              <div className="col-span-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(i)}
                  className="h-9 w-9 text-red-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-2 border-t">
            <span className="text-sm text-gray-500 mr-3">Total estimado:</span>
            <span className="text-base font-bold text-gray-900">
              ${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      <Button variant="outline" size="sm" onClick={add}>
        <PlusCircle className="h-4 w-4 mr-2" /> Agregar item
      </Button>
    </div>
  );
}
