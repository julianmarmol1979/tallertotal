export type ServiceOrderStatus = "Open" | "InProgress" | "Completed" | "Cancelled";
export type ServiceItemType = "Labor" | "Part";
export type QuoteStatus = "None" | "Pending" | "Approved" | "Rejected";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt: string;
  vehicleCount: number;
}

export interface Vehicle {
  id: string;
  customerId: string;
  customerName: string;
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
  notes?: string;
}

export interface ServiceItem {
  id: string;
  description: string;
  type: ServiceItemType;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ServiceOrder {
  id: string;
  vehicleId: string;
  licensePlate: string;
  vehicleDescription: string;
  customerName: string;
  customerPhone: string;
  status: ServiceOrderStatus;
  diagnosisNotes?: string;
  mileageIn?: number;
  assignedMechanic?: string;
  internalNotes?: string;
  estimatedDeliveryAt?: string;
  totalEstimate: number;
  totalFinal: number;
  createdAt: string;
  completedAt?: string;
  quoteStatus: QuoteStatus;
  lastActivityAt: string;
  items: ServiceItem[];
  portalToken: string;
}

// Lean read-only view exposed to the customer via /portal/[token]
export interface PortalOrder {
  id: string;
  licensePlate: string;
  vehicleDescription: string;
  customerName: string;
  status: ServiceOrderStatus;
  quoteStatus: QuoteStatus;
  diagnosisNotes?: string;
  estimatedDeliveryAt?: string;
  totalEstimate: number;
  totalFinal: number;
  createdAt: string;
  completedAt?: string;
  items: ServiceItem[];
}

export interface ServiceOrderLog {
  id: string;
  event: string;
  oldValue?: string;
  newValue?: string;
  changedBy: string;
  changedAt: string;
}

export interface DashboardMetrics {
  revenueThisMonth: number;
  revenueLastMonth: number;
  ordersThisMonth: number;
  ordersLastMonth: number;
  ordersByStatus: { status: string; count: number; revenue: number }[];
  topMechanic?: { name: string; orderCount: number };
  monthlyStats: { month: string; revenue: number; orders: number }[];
  mechanicStats: { name: string; orders: number; revenue: number }[];
  avgTicket: number;
  overdueCount: number;
  completionRate: number;
}

export interface CreateCustomerDto {
  name: string;
  phone: string;
  email?: string;
}

export interface CreateVehicleDto {
  customerId: string;
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
  notes?: string;
}

export interface CreateServiceItemDto {
  description: string;
  type: ServiceItemType;
  quantity: number;
  unitPrice: number;
}

export interface UpdateServiceOrderDto {
  status: ServiceOrderStatus;
  diagnosisNotes?: string;
  mileageIn?: number;
  assignedMechanic?: string;
  internalNotes?: string;
  estimatedDeliveryAt?: string;
  totalEstimate: number;
  totalFinal: number;
  items: CreateServiceItemDto[];
}

export interface CreateServiceOrderDto {
  vehicleId: string;
  diagnosisNotes?: string;
  mileageIn?: number;
  assignedMechanic?: string;
  internalNotes?: string;
  estimatedDeliveryAt?: string;
  items: CreateServiceItemDto[];
}

export interface Mechanic {
  id: string;
  name: string;
  phone?: string;
  specialty?: string;
  isActive: boolean;
}

export interface CreateMechanicDto {
  name: string;
  phone?: string;
  specialty?: string;
}
