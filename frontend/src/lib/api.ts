import type {
  Customer,
  Vehicle,
  ServiceOrder,
  ServiceOrderStatus,
  CreateCustomerDto,
  CreateVehicleDto,
  CreateServiceOrderDto,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Customers
export const customersApi = {
  getAll: (search?: string) =>
    request<Customer[]>(`/api/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  getById: (id: string) => request<Customer>(`/api/customers/${id}`),
  create: (dto: CreateCustomerDto) =>
    request<Customer>("/api/customers", { method: "POST", body: JSON.stringify(dto) }),
  update: (id: string, dto: CreateCustomerDto) =>
    request<Customer>(`/api/customers/${id}`, { method: "PUT", body: JSON.stringify(dto) }),
  delete: (id: string) => request<void>(`/api/customers/${id}`, { method: "DELETE" }),
};

// Vehicles
export const vehiclesApi = {
  getAll: (params?: { plate?: string; customerId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.plate) qs.set("plate", params.plate);
    if (params?.customerId) qs.set("customerId", params.customerId);
    const q = qs.toString();
    return request<Vehicle[]>(`/api/vehicles${q ? `?${q}` : ""}`);
  },
  getById: (id: string) => request<Vehicle>(`/api/vehicles/${id}`),
  create: (dto: CreateVehicleDto) =>
    request<Vehicle>("/api/vehicles", { method: "POST", body: JSON.stringify(dto) }),
};

// Service Orders
export const serviceOrdersApi = {
  getAll: (params?: { status?: ServiceOrderStatus; plate?: string; customer?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.plate) qs.set("plate", params.plate);
    if (params?.customer) qs.set("customer", params.customer);
    const q = qs.toString();
    return request<ServiceOrder[]>(`/api/serviceorders${q ? `?${q}` : ""}`);
  },
  getById: (id: string) => request<ServiceOrder>(`/api/serviceorders/${id}`),
  create: (dto: CreateServiceOrderDto) =>
    request<ServiceOrder>("/api/serviceorders", { method: "POST", body: JSON.stringify(dto) }),
  updateStatus: (id: string, status: ServiceOrderStatus) =>
    request<ServiceOrder>(`/api/serviceorders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(status),
    }),
};
