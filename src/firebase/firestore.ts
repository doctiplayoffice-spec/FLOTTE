// Mock Firestore Implementation with LocalStorage and Event Pub/Sub
import { getCurrentUser } from './auth';

import { Vehicle, VehicleCategory } from '../models/Vehicle';
import { Personnel } from '../models/Personnel';

export interface Mission {
  id: string;
  num: string;
  type?: string; // optional mission type
  vehicleId: string; // Reference to vehicle plate
  personnelId: string; // Reference to staff id
  service: string;
  departureDate: string;
  returnDatePlanned: string;
  departurePlace: string;
  destination: string;
  purpose: string;
  status: 'Planifiée' | 'En cours' | 'Terminée' | 'Annulée';
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

const generateVehicles = (): Vehicle[] => {
  const list: Vehicle[] = [];
  const specs: { category: VehicleCategory; brand: string; model: string; total: number; dispo: number }[] = [
    { category: 'SEMI_REMORQUE', brand: 'Scania', model: 'R450 (Semi-remorque)', total: 39, dispo: 26 },
    { category: 'AUTOCAR_VOLVO', brand: 'Volvo', model: '9700 (Autocar)', total: 10, dispo: 8 },
    { category: 'AUTOCAR_DAEWOO', brand: 'Daewoo', model: 'BH120 (Autocar)', total: 1, dispo: 0 },
    { category: 'CARGO', brand: 'Mercedes-Benz', model: 'Actros Cargo', total: 70, dispo: 60 },
    { category: 'FOURGON', brand: 'Iveco', model: 'Eurocargo Fourgon', total: 1, dispo: 1 },
    { category: 'DEPANNAGE', brand: 'Renault', model: 'Kerax Dépannage', total: 3, dispo: 2 },
    { category: 'CCT_EAU', brand: 'MAN', model: 'TGS Citerne Eau', total: 1, dispo: 1 },
    { category: 'CCT_CARB', brand: 'MAN', model: 'TGS Citerne Carb', total: 2, dispo: 2 },
    { category: 'TRACTEUR_PC', brand: 'Oshkosh', model: 'M1070 Tracteur PC', total: 39, dispo: 28 },
    { category: 'FOURGONETTE', brand: 'Peugeot', model: 'Partner (Fourgonnette)', total: 16, dispo: 16 },
    { category: 'VLTT', brand: 'Toyota', model: 'Land Cruiser (VLTT)', total: 16, dispo: 14 },
    { category: 'MOTO', brand: 'BMW', model: 'F850 GS (Moto)', total: 16, dispo: 16 },
    { category: 'RENAULT_EXPRESS', brand: 'Renault', model: 'Express (Utilitaire)', total: 20, dispo: 16 }
  ];

  let idCounter = 1;
  specs.forEach(spec => {
    for (let i = 0; i < spec.total; i++) {
      const isDispo = i < spec.dispo;
      const isDetached = (spec.category === 'CARGO' && i === spec.total - 1) || (spec.category === 'TRACTEUR_PC' && i === spec.total - 1);
      
      const categoryShort = spec.category.substring(0, 3);
      const plateNumber = 10000 + idCounter;
      const plate = `${plateNumber}-A-${spec.category === 'RENAULT_EXPRESS' ? 'VL' : categoryShort}`;
      
      const v: Vehicle = {
        id: `v-${idCounter++}`,
        plate,
        brand: spec.brand,
        model: spec.model,
        category: spec.category,
        status: isDispo ? 'Disponible' : (i % 2 === 0 ? 'Panne' : 'Maintenance'),
        motif: isDispo ? undefined : (i % 2 === 0 ? 'Avarie mécanique signalée' : 'Entretien périodique atelier'),
        statusChangedDate: '2026-06-15',
        mileage: Math.floor(25000 + Math.random() * 125000),
        lastMaint: '2026-04-10',
        nextMaint: '2026-10-10',
        nextMaintMileage: 160000,
        nextInspection: '2026-12-31',
        insuranceExpiry: '2026-12-31',
        notes: isDetached ? 'Dont (01) détaché' : undefined
      };
      list.push(v);
    }
  });

  return list;
};

const INITIAL_VEHICLES: Vehicle[] = generateVehicles();
const INITIAL_PERSONNEL: Personnel[] = [];
const INITIAL_MISSIONS: Mission[] = [];
const INITIAL_MAINTENANCE: MaintenanceRecord[] = [];
const INITIAL_LOGS: ActivityLog[] = [
  { id: 'l-1', userEmail: 'admin@fleet.com', action: 'Initialisation', target: 'Système', timestamp: new Date().toISOString() }
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
    if (key === 'fleet_db_vehicles' && (parsed.length !== 234 || (parsed.length > 0 && ['VL', 'PL', 'SR', 'TC', 'PC', 'RE'].includes(parsed[0].category)))) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    if (key === 'fleet_db_personnel' && parsed.length > 0 && parsed.some((x: any) => !x.matricule)) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    if (key === 'fleet_db_missions' && parsed.length > 0 && parsed.some((x: any) => x.destination === 'Paris' || x.vehicleId === '67890-B-26')) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    if (key === 'fleet_db_maintenance' && parsed.length > 0 && parsed.some((x: any) => x.vehicleId === 'EE-789-FF' || x.vehicleId === '11223-D-6')) {
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
export const getPersonnel = (): Personnel[] => getStore('fleet_db_personnel', INITIAL_PERSONNEL);
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
