export type ServiceOrderStatus = "Open" | "InProgress" | "Completed" | "Cancelled";
export type ServiceItemType = "Labor" | "Part";

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
  totalEstimate: number;
  totalFinal: number;
  createdAt: string;
  completedAt?: string;
  items: ServiceItem[];
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

export interface CreateServiceOrderDto {
  vehicleId: string;
  diagnosisNotes?: string;
  mileageIn?: number;
  assignedMechanic?: string;
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
