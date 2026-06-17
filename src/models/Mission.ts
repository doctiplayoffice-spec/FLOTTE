// src/models/Mission.ts
export interface Mission {
  id: string;
  num: string;
  vehicleId: string; // reference to Vehicle.id
  personnelId: string; // reference to Personnel.id
  type: string;
  departureDate: string; // ISO date string
  returnDatePlanned: string; // ISO date string
  departurePlace: string;
  destination: string;
  purpose: string;
  status: 'Planifiée' | 'En cours' | 'En attente' | 'Terminée' | 'Annulée';
  notes: string;
}
