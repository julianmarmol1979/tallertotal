import type {
  Customer,
  Vehicle,
  ServiceOrder,
  ServiceOrderStatus,
  CreateCustomerDto,
  CreateVehicleDto,
  CreateServiceOrderDto,
  Mechanic,
  CreateMechanicDto,
} from "@/types";

// All calls go through the Next.js proxy which adds the JWT from httpOnly cookie
const BASE_URL = "/api/proxy";

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
    request<Customer[]>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  getById: (id: string) => request<Customer>(`/customers/${id}`),
  create: (dto: CreateCustomerDto) =>
    request<Customer>("/customers", { method: "POST", body: JSON.stringify(dto) }),
  update: (id: string, dto: CreateCustomerDto) =>
    request<Customer>(`/customers/${id}`, { method: "PUT", body: JSON.stringify(dto) }),
  delete: (id: string) => request<void>(`/customers/${id}`, { method: "DELETE" }),
};

// Vehicles
export const vehiclesApi = {
  getAll: (params?: { plate?: string; customerId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.plate) qs.set("plate", params.plate);
    if (params?.customerId) qs.set("customerId", params.customerId);
    const q = qs.toString();
    return request<Vehicle[]>(`/vehicles${q ? `?${q}` : ""}`);
  },
  getById: (id: string) => request<Vehicle>(`/vehicles/${id}`),
  create: (dto: CreateVehicleDto) =>
    request<Vehicle>("/vehicles", { method: "POST", body: JSON.stringify(dto) }),
  update: (id: string, dto: CreateVehicleDto) =>
    request<Vehicle>(`/vehicles/${id}`, { method: "PUT", body: JSON.stringify(dto) }),
  delete: (id: string) => request<void>(`/vehicles/${id}`, { method: "DELETE" }),
};

// Mechanics
export const mechanicsApi = {
  getAll: (activeOnly?: boolean) =>
    request<Mechanic[]>(`/mechanics${activeOnly ? "?activeOnly=true" : ""}`),
  create: (dto: CreateMechanicDto) =>
    request<Mechanic>("/mechanics", { method: "POST", body: JSON.stringify(dto) }),
  update: (id: string, dto: CreateMechanicDto) =>
    request<Mechanic>(`/mechanics/${id}`, { method: "PUT", body: JSON.stringify(dto) }),
  toggle: (id: string) =>
    request<Mechanic>(`/mechanics/${id}/toggle`, { method: "PATCH" }),
  delete: (id: string) => request<void>(`/mechanics/${id}`, { method: "DELETE" }),
};

// Service Orders
export const serviceOrdersApi = {
  getAll: (params?: { status?: ServiceOrderStatus; plate?: string; customer?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.plate) qs.set("plate", params.plate);
    if (params?.customer) qs.set("customer", params.customer);
    const q = qs.toString();
    return request<ServiceOrder[]>(`/serviceorders${q ? `?${q}` : ""}`);
  },
  getById: (id: string) => request<ServiceOrder>(`/serviceorders/${id}`),
  create: (dto: CreateServiceOrderDto) =>
    request<ServiceOrder>("/serviceorders", { method: "POST", body: JSON.stringify(dto) }),
  updateStatus: (id: string, status: ServiceOrderStatus) =>
    request<ServiceOrder>(`/serviceorders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(status),
    }),
};

// Admin API — calls go to proxy which forwards to backend with SuperAdmin JWT
export const adminApi = {
  getTenants: () => request<TenantResponse[]>("/admin/tenants"),
  createTenant: (name: string) =>
    request<TenantResponse>("/admin/tenants", { method: "POST", body: JSON.stringify({ name }) }),
  toggleTenant: (id: string) =>
    request<{ isActive: boolean }>(`/admin/tenants/${id}/toggle`, { method: "PATCH" }),
  getUsers: (tenantId: string) => request<UserResponse[]>(`/admin/tenants/${tenantId}/users`),
  createUser: (tenantId: string, dto: { username: string; password: string; role: string }) =>
    request<UserResponse>(`/admin/tenants/${tenantId}/users`, { method: "POST", body: JSON.stringify(dto) }),
  deleteUser: (userId: string) => request<void>(`/admin/users/${userId}`, { method: "DELETE" }),
};

// Admin types
export interface TenantResponse {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  userCount: number;
}

export interface UserResponse {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}
