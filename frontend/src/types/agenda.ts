export interface ServiceScheduleEntry {
  id: string;
  serviceType: string;
  lastServiceDate?: string;
  intervalMonths?: number;
  intervalKm?: number;
  nextDueDate?: string;
  isActive: boolean;
  lastAlertSentAt?: string;
  daysUntilDue: number | null;
}

export interface ServiceDocument {
  id: string;
  fileName: string;
  storageUrl: string;
  uploadedAt: string;
  parsedAt?: string;
  vehicleLicensePlate?: string;
  vehicleDescription?: string;
  notes?: string;
  entries: ServiceScheduleEntry[];
}
