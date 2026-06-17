// src/models/Vehicle.ts

/**
 * Catégories de véhicules opérationnelles réelles du parc militaire.
 */
export type VehicleCategory =
  | 'SEMI_REMORQUE'
  | 'AUTOCAR_VOLVO'
  | 'AUTOCAR_DAEWOO'
  | 'CARGO'
  | 'FOURGON'
  | 'DEPANNAGE'
  | 'CCT_EAU'
  | 'CCT_CARB'
  | 'TRACTEUR_PC'
  | 'FOURGONETTE'
  | 'VLTT'
  | 'MOTO'
  | 'RENAULT_EXPRESS';

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {
  SEMI_REMORQUE: 'Semi-remorque',
  AUTOCAR_VOLVO: 'Autocar Volvo',
  AUTOCAR_DAEWOO: 'Autocar Daewoo',
  CARGO: 'Camion Cargo',
  FOURGON: 'Camion Fourgon',
  DEPANNAGE: 'Camion Dépannage',
  CCT_EAU: 'Camion Citerne Eau (CCT EAU)',
  CCT_CARB: 'Camion Citerne Carburant (CCT CARB)',
  TRACTEUR_PC: 'Tracteur Porte-Char',
  FOURGONETTE: 'Fourgonnette',
  VLTT: 'Véhicule Léger Tout Terrain (VLTT)',
  MOTO: 'Moto',
  RENAULT_EXPRESS: 'Renault Express',
};

/**
 * Correspondance entre la catégorie opérationnelle du véhicule et le permis requis.
 */
export const VEHICLE_REQUIRED_LICENCE: Record<VehicleCategory, string> = {
  SEMI_REMORQUE: 'SR',
  AUTOCAR_VOLVO: 'TC',
  AUTOCAR_DAEWOO: 'TC',
  CARGO: 'PL',
  FOURGON: 'PL',
  DEPANNAGE: 'PL',
  CCT_EAU: 'PL',
  CCT_CARB: 'PL',
  TRACTEUR_PC: 'PC',
  FOURGONETTE: 'VL',
  VLTT: 'VL',
  MOTO: 'MOTO',
  RENAULT_EXPRESS: 'VL', // Renault Express se conduit avec un permis VL
};

/**
 * Vérifie si le conducteur possède le permis requis pour cette catégorie de véhicule.
 */
export function isLicenceValid(driverLicences: string[], vehicleCategory: VehicleCategory): boolean {
  if (!driverLicences) return false;
  const req = VEHICLE_REQUIRED_LICENCE[vehicleCategory];
  return driverLicences.includes(req);
}

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
