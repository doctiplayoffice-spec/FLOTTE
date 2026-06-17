// src/models/Maintenance.ts
export interface MaintenanceRecord {
  id: string;
  vehicleId: string; // reference to Vehicle.id
  type: 'Préventive' | 'Corrective';
  date: string; // ISO date
  mileage: number;
  desc: string;
  status: 'Prévue' | 'En cours' | 'Terminée';
}
