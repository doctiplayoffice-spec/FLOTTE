// src/models/Vehicle.ts

/**
 * Catégories de véhicules — liste fixe, 6 valeurs.
 */
export type VehicleCategory = 'VL' | 'PL' | 'SR' | 'TC' | 'PC' | 'RE';

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {
  VL: 'Véhicule léger',
  PL: 'Poids lourd',
  SR: 'Semi-remorque',
  TC: 'Transport en commun',
  PC: 'Porte-char',
  RE: 'Renault Express (utilitaire)',
};

/**
 * Statuts journaliers du véhicule — mis à jour chaque matin par le service technique.
 *
 * - Disponible   → prêt à être désigné par le BTC
 * - En mission   → actuellement en convoi
 * - Maintenance  → immobilisé pour entretien planifié ou curatif
 * - Panne        → immobilisé suite à une avarie
 */
export type VehicleStatus = 'Disponible' | 'En mission' | 'Maintenance' | 'Panne';

export interface Vehicle {
  id: string;

  // ── Identification ──────────────────────────────────────────────
  plate: string;           // Matricule militaire (identifiant unique)
  brand: string;           // Marque
  model: string;           // Modèle
  category: VehicleCategory; // Catégorie obligatoire (VL/PL/SR/TC/PC/RE)

  // ── Situation journalière (mise à jour par le service technique) ─
  status: VehicleStatus;
  motif?: string;          // Obligatoire si status ≠ 'Disponible' — raison de l'indisponibilité
  statusChangedDate: string; // ISO date — dernière modification du statut

  // ── Données techniques ──────────────────────────────────────────
  mileage: number;
  lastMaint: string;        // ISO date
  nextMaint: string;        // ISO date
  nextMaintMileage: number;
  nextInspection: string;   // ISO date
  insuranceExpiry: string;  // ISO date

  // ── Divers ──────────────────────────────────────────────────────
  notes?: string;
}
