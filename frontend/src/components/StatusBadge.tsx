import { Badge } from "@/components/ui/badge";
import type { ServiceOrderStatus } from "@/types";

const config: Record<ServiceOrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" ; className: string }> = {
  Open:       { label: "Abierta",     variant: "outline",      className: "border-blue-300 text-blue-700 bg-blue-50" },
  InProgress: { label: "En progreso", variant: "default",      className: "bg-amber-100 text-amber-800 border-amber-300" },
  Completed:  { label: "Completada",  variant: "secondary",    className: "bg-green-100 text-green-800 border-green-300" },
  Cancelled:  { label: "Cancelada",   variant: "destructive",  className: "bg-gray-100 text-gray-500 border-gray-300" },
};

export function StatusBadge({ status }: { status: ServiceOrderStatus }) {
  const { label, className } = config[status];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
