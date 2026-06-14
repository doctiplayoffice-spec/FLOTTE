// Mock Firestore Implementation with LocalStorage and Event Pub/Sub
import { getCurrentUser } from './auth';

export interface Vehicle {
  id: string; // Used as Plate/Immatriculation in our app for uniqueness, or auto-generated
  plate: string;
  brand: string;
  model: string;
  type: string;
  mileage: number;
  status: 'Disponible' | 'En mission' | 'Maintenance' | 'Panne';
  lastMaint: string;
  nextMaint: string;
  notes: string;
  nextInspection: string;
  insuranceExpiry: string;
  nextMaintMileage: number;
  statusChangedDate: string;
}

export interface Staff {
  id: string;
  firstname: string;
  lastname: string;
  service: string;
  title: string;
  status: 'Disponible' | 'Mission' | 'Congé' | 'Formation' | 'Maladie' | 'Atelier';
}

export interface Mission {
  id: string;
  num: string;
  vehicleId: string; // Reference to vehicle plate
  personnelId: string; // Reference to staff id
  service: string;
  departureDate: string;
  returnDatePlanned: string;
  departurePlace: string;
  destination: string;
  purpose: string;
  status: 'En attente' | 'En cours' | 'Terminée' | 'Annulée';
  notes: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string; // Reference to vehicle plate
  type: 'Préventive' | 'Corrective';
  date: string;
  mileage: number;
  desc: string;
  status: 'Prévue' | 'En cours' | 'Terminée';
}

export interface ActivityLog {
  id: string;
  userEmail: string;
  action: string;
  target: string;
  timestamp: string;
}

export type GPSTrackingStatus = 'actif' | 'arrêté' | 'non_autorisé';

export interface GPSTracking {
  id: string;           // same as missionId for 1-to-1
  missionId: string;
  vehicleId: string;    // plate
  driverId: string;     // staff id
  lat: number;
  lng: number;
  accuracy?: number; // optional GPS accuracy in meters
  timestamp: string;    // ISO
  trackingStatus: GPSTrackingStatus;
}

export interface MileageLog {
  id: string;
  vehicleId: string;    // plate
  driverId: string;     // staff id
  missionId: string;
  date: string;         // YYYY-MM-DD
  mileage: number;
  observation: string;
  submittedAt: string;  // ISO
}

// Initial mock data templates
const INITIAL_VEHICLES: Vehicle[] = [
  { 
    id: 'v-1', 
    plate: '12345-A-6', 
    brand: 'Scania', 
    model: 'R500 V8', 
    type: 'Poids Lourd', 
    mileage: 124500, 
    status: 'Disponible', 
    lastMaint: '2026-05-15', 
    nextMaint: '2026-11-15', 
    notes: 'Rien à signaler, vidange effectuée',
    nextInspection: '2026-07-10',
    insuranceExpiry: '2026-06-25',
    nextMaintMileage: 125300,
    statusChangedDate: '2026-06-13'
  },
  { 
    id: 'v-2', 
    plate: '67890-B-26', 
    brand: 'Mercedes', 
    model: 'Sprinter 314', 
    type: 'Fourgon', 
    mileage: 89300, 
    status: 'En mission', 
    lastMaint: '2026-06-01', 
    nextMaint: '2026-12-01', 
    notes: 'Voyant climatisation à surveiller',
    nextInspection: '2026-09-15',
    insuranceExpiry: '2026-11-20',
    nextMaintMileage: 95000,
    statusChangedDate: '2026-06-12'
  },
  { 
    id: 'v-3', 
    plate: '11223-D-6', 
    brand: 'Iveco', 
    model: 'Daily 35S18', 
    type: 'Fourgon', 
    mileage: 154800, 
    status: 'Maintenance', 
    lastMaint: '2026-02-10', 
    nextMaint: '2026-06-10', 
    notes: 'Injecteur défectueux cylindre 3',
    nextInspection: '2026-08-01',
    insuranceExpiry: '2026-12-05',
    nextMaintMileage: 160000,
    statusChangedDate: '2026-06-01'
  },
  { 
    id: 'v-4', 
    plate: '44556-H-6', 
    brand: 'Renault', 
    model: 'Zoé E-Tech', 
    type: 'Berline (Électrique)', 
    mileage: 23100, 
    status: 'Panne', 
    lastMaint: '2026-04-18', 
    nextMaint: '2026-10-18', 
    notes: 'Panne alternateur signalée par l\'équipe',
    nextInspection: '2026-10-18',
    insuranceExpiry: '2026-10-18',
    nextMaintMileage: 30000,
    statusChangedDate: '2026-06-10'
  }
];

const INITIAL_STAFF: Staff[] = [
  { id: 's-1', firstname: 'Ahmed', lastname: 'Alami', service: 'Logistique', title: 'Chauffeur PL', status: 'Mission' },
  { id: 's-2', firstname: 'Fatima', lastname: 'Zohra', service: 'Exploitation', title: 'Responsable Dépôt', status: 'Disponible' },
  { id: 's-3', firstname: 'Rachid', lastname: 'Amrani', service: 'Logistique', title: 'Livreur VL', status: 'Disponible' },
  { id: 's-4', firstname: 'Khadija', lastname: 'Bennani', service: 'Administration', title: 'Secrétaire de Flotte', status: 'Disponible' }
];

const INITIAL_MISSIONS: Mission[] = [
  { id: 'm-1', num: 'MS-2026-001', vehicleId: '67890-B-26', personnelId: 's-1', service: 'Logistique', departureDate: '2026-06-12', returnDatePlanned: '2026-06-15', departurePlace: 'Tanger', destination: 'Casablanca', purpose: 'Acheminement pièces détachées', status: 'En cours', notes: 'Faire le plein au retour' },
  { id: 'm-2', num: 'MS-2026-002', vehicleId: '12345-A-6', personnelId: 's-3', service: 'Logistique', departureDate: '2026-06-08', returnDatePlanned: '2026-06-09', departurePlace: 'Casablanca', destination: 'Marrakech', purpose: 'Transport de transformateur', status: 'Terminée', notes: 'Livraison effectuée avec 10 min d\'avance' }
];

const INITIAL_MAINTENANCE: MaintenanceRecord[] = [
  { id: 'mt-1', vehicleId: '11223-D-6', type: 'Corrective', date: '2026-06-12', mileage: 154800, desc: 'Démontage rampe injection et test débit', status: 'En cours' },
  { id: 'mt-2', vehicleId: '12345-A-6', type: 'Préventive', date: '2026-05-15', mileage: 124500, desc: 'Remplacement filtres et huile moteur', status: 'Terminée' },
  { id: 'mt-3', vehicleId: '44556-H-6', type: 'Préventive', date: '2026-06-18', mileage: 23100, desc: 'Contrôle réglementaire et test batterie', status: 'Prévue' }
];

const INITIAL_LOGS: ActivityLog[] = [
  { id: 'l-1', userEmail: 'admin@fleet.com', action: 'Initialisation', target: 'Système', timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'l-2', userEmail: 'manager@fleet.com', action: 'Création', target: 'Véhicule 12345-A-6', timestamp: new Date(Date.now() - 3600000).toISOString() }
];

// Helper to retrieve database storage structure
const getStore = <T>(key: string, initial: T[]): T[] => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  try {
    const parsed = JSON.parse(data);
    // Schema migration/reset check:
    if (key === 'fleet_db_vehicles' && parsed.length > 0 && (parsed[0].nextInspection === undefined || parsed[0].plate === 'AA-123-BB')) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    if (key === 'fleet_db_personnel' && parsed.length > 0 && (parsed.some((x: any) => x.status === 'Indisponible') || parsed.some((x: any) => x.firstname === 'Jean'))) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    if (key === 'fleet_db_missions' && parsed.length > 0 && parsed.some((x: any) => x.destination === 'Paris')) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    if (key === 'fleet_db_maintenance' && parsed.length > 0 && parsed.some((x: any) => x.vehicleId === 'EE-789-FF')) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return parsed;
  } catch (e) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
};

const saveStore = <T>(key: string, data: T[]): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Pub/Sub listeners for reactive onSnapshot
type SnapshotCallback = () => void;
const listeners: Record<string, Set<SnapshotCallback>> = {
  vehicles: new Set(),
  personnel: new Set(),
  missions: new Set(),
  maintenance: new Set(),
  activityLogs: new Set(),
  gpsTracking: new Set(),
  mileageLogs: new Set(),
};

const triggerUpdate = (collectionName: string) => {
  const collectionListeners = listeners[collectionName];
  if (collectionListeners) {
    collectionListeners.forEach(callback => callback());
  }
};

// Audit logging helper
const addAuditLog = (action: string, target: string) => {
  const user = getCurrentUser();
  const logs = getStore<ActivityLog>('fleet_db_activityLogs', INITIAL_LOGS);
  const newLog: ActivityLog = {
    id: `l-${Date.now()}`,
    userEmail: user ? user.email : 'Visiteur anonyme',
    action,
    target,
    timestamp: new Date().toISOString()
  };
  saveStore('fleet_db_activityLogs', [newLog, ...logs]);
  triggerUpdate('activityLogs');
};

// --- FIRESTORE APIS ---

export const getVehicles = (): Vehicle[] => getStore('fleet_db_vehicles', INITIAL_VEHICLES);
export const getPersonnel = (): Staff[] => getStore('fleet_db_personnel', INITIAL_STAFF);
export const getMissions = (): Mission[] => getStore('fleet_db_missions', INITIAL_MISSIONS);
export const getMaintenance = (): MaintenanceRecord[] => getStore('fleet_db_maintenance', INITIAL_MAINTENANCE);
export const getActivityLogs = (): ActivityLog[] => getStore('fleet_db_activityLogs', INITIAL_LOGS);
export const getGPSTrackings = (): GPSTracking[] => getStore<GPSTracking>('fleet_db_gpsTracking', []);
export const getMileageLogs = (): MileageLog[] => getStore<MileageLog>('fleet_db_mileageLogs', []);

// GPS-specific: upsert (create or update by missionId)
export const upsertGPSTracking = (data: Omit<GPSTracking, 'id'>): void => {
  const all = getGPSTrackings();
  const idx = all.findIndex(t => t.missionId === data.missionId);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...data, id: data.missionId };
  } else {
    all.push({ id: data.missionId, ...data });
  }
  localStorage.setItem('fleet_db_gpsTracking', JSON.stringify(all));
  triggerUpdate('gpsTracking');
};

// GPS-specific: stop tracking for a mission
export const stopGPSTracking = (missionId: string): void => {
  const all = getGPSTrackings();
  const idx = all.findIndex(t => t.missionId === missionId);
  if (idx !== -1) {
    all[idx].trackingStatus = 'arrêté';
    localStorage.setItem('fleet_db_gpsTracking', JSON.stringify(all));
    triggerUpdate('gpsTracking');
  }
};

// GPS-specific: remove tracking record (on mission close)
export const removeGPSTracking = (missionId: string): void => {
  const all = getGPSTrackings().filter(t => t.missionId !== missionId);
  localStorage.setItem('fleet_db_gpsTracking', JSON.stringify(all));
  triggerUpdate('gpsTracking');
};

// collection references
export const db = {};

export const collection = (dbInstance: any, path: string) => {
  return path; // Simple string identifier
};

// Add record
export const addDoc = async (colName: string, data: any): Promise<any> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const dbKey = `fleet_db_${colName}`;
      const records = getStore<any>(dbKey, []);
      const newId = `${colName.charAt(0)}-${Date.now()}`;
      
      const newRecord = { id: newId, ...data };
      saveStore(dbKey, [...records, newRecord]);

      addAuditLog('Création', `${colName} ID: ${newId}`);
      triggerUpdate(colName);
      resolve(newRecord);
    }, 150);
  });
};

// Update record
export const updateDoc = async (colName: string, id: string, data: any): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const dbKey = `fleet_db_${colName}`;
      const records = getStore<any>(dbKey, []);
      const index = records.findIndex((r: any) => r.id === id || (colName === 'vehicles' && r.plate === id));

      if (index !== -1) {
        records[index] = { ...records[index], ...data };
        saveStore(dbKey, records);
        
        const targetDesc = colName === 'vehicles' ? `Véhicule ${records[index].plate}` : `${colName} ID ${id}`;
        addAuditLog('Modification', targetDesc);
        triggerUpdate(colName);
      }
      resolve();
    }, 150);
  });
};

// Delete record
export const deleteDoc = async (colName: string, id: string): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const dbKey = `fleet_db_${colName}`;
      const records = getStore<any>(dbKey, []);
      
      const target = records.find((r: any) => r.id === id || (colName === 'vehicles' && r.plate === id));
      const filtered = records.filter((r: any) => r.id !== id && (colName !== 'vehicles' || r.plate !== id));
      saveStore(dbKey, filtered);

      if (target) {
        const targetDesc = colName === 'vehicles' ? `Véhicule ${target.plate}` : `${colName} ID ${id}`;
        addAuditLog('Suppression', targetDesc);
      }
      triggerUpdate(colName);
      resolve();
    }, 150);
  });
};

// Mileage log: driver submits daily mileage
export const addMileageLog = (data: Omit<MileageLog, 'id' | 'submittedAt'>): void => {
  const logs = getMileageLogs();
  const newLog: MileageLog = {
    id: `ml-${Date.now()}`,
    ...data,
    submittedAt: new Date().toISOString()
  };
  logs.unshift(newLog); // newest first
  localStorage.setItem('fleet_db_mileageLogs', JSON.stringify(logs));
  triggerUpdate('mileageLogs');

  // Also update the vehicle's mileage in vehicles store
  const vehicles = getStore<any>('fleet_db_vehicles', []);
  const vIdx = vehicles.findIndex((v: any) => v.plate === data.vehicleId);
  if (vIdx !== -1 && data.mileage > vehicles[vIdx].mileage) {
    vehicles[vIdx].mileage = data.mileage;
    localStorage.setItem('fleet_db_vehicles', JSON.stringify(vehicles));
    triggerUpdate('vehicles');
  }
};


// Reactive Subscription
export const onSnapshot = (colName: string, callback: () => void) => {
  listeners[colName].add(callback);
  
  // Call initially
  callback();

  // Return unsubscribe
  return () => {
    listeners[colName].delete(callback);
  };
};
