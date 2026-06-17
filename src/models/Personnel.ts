// src/models/Personnel.ts
import type { VehicleCategory } from './Vehicle';

/**
 * Grades militaires — du plus bas au plus élevé.
 * Séparés en deux familles : sous-officiers/hommes de rang et officiers.
 */
export const GRADES_RANKS = [
  'Soldat 2e classe',
  'Soldat 1e classe',
  'Caporal',
  'Caporal-chef',
  'Sergent',
  'Sergent-chef',
  'Adjudant',
  'Adjudant-chef',
  'Major',
] as const;

export const GRADES_OFFICERS = [
  'Sous-lieutenant',
  'Lieutenant',
  'Capitaine',
  'Commandant',
  'Lieutenant-colonel',
  'Colonel',
  'Général de brigade',
  'Général de division',
] as const;

export type GradeRank    = typeof GRADES_RANKS[number];
export type GradeOfficer = typeof GRADES_OFFICERS[number];
export type Grade        = GradeRank | GradeOfficer;

/** Vrai si le grade est officier — utilisé pour filtrer les officiers responsables RE. */
export function isOfficer(grade: Grade): grade is GradeOfficer {
  return (GRADES_OFFICERS as readonly string[]).includes(grade);
}

/**
 * Statuts journaliers du personnel — mis à jour chaque matin par le service des effectifs.
 *
 * - Présent     → disponible pour désignation BTC
 * - En mission  → déjà engagé dans un convoi
 * - Permission  → absent, permission accordée
 * - Congé       → absent, congé réglementaire
 * - Maladie     → absent, arrêt médical
 * - Formation   → absent, en stage ou école
 */
export type PersonnelStatus =
  | 'Présent'
  | 'En mission'
  | 'Permission'
  | 'Congé'
  | 'Maladie'
  | 'Formation';

export interface Personnel {
  id: string;

  // ── Identification ──────────────────────────────────────────────
  matricule: string;        // Matricule militaire (identifiant unique)
  grade: Grade;             // Grade militaire
  lastname: string;         // Nom de famille
  firstname: string;        // Prénom
  service: string;          // Service d'affectation (BTC, technique, effectifs…)

  // ── Qualification permis ────────────────────────────────────────
  // Un même homme peut détenir plusieurs permis.
  // Correspond exactement aux catégories véhicules → filtre chauffeur dans le BTC.
  licenceCategories: VehicleCategory[];
  licenceExpiry?: string;   // ISO date — date d'expiration du permis principal

  // ── Situation journalière (mise à jour par le service des effectifs) ─
  status: PersonnelStatus;
  statusEndDate?: string;   // ISO date — fin prévue de la permission / congé / formation

  // ── Divers ──────────────────────────────────────────────────────
  notes?: string;
}
