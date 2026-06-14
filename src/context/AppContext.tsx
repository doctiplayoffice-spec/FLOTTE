import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  getCurrentUser, 
  signOut, 
  signInWithEmailAndPassword,
  User 
} from '../firebase/auth';
import { 
  getVehicles, 
  getPersonnel, 
  getMissions, 
  getMaintenance, 
  getActivityLogs, 
  getGPSTrackings,
  getMileageLogs,
  upsertGPSTracking,
  stopGPSTracking,
  removeGPSTracking,
  addMileageLog,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  Vehicle,
  Staff,
  Mission,
  MaintenanceRecord,
  ActivityLog,
  GPSTracking,
  MileageLog
} from '../firebase/firestore';

interface AppContextProps {
  user: User | null;
  vehicles: Vehicle[];
  personnel: Staff[];
  missions: Mission[];
  maintenance: MaintenanceRecord[];
  activityLogs: ActivityLog[];
  gpsTrackings: GPSTracking[];
  mileageLogs: MileageLog[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  loading: boolean;
  loginUser: (email: string, pass: string) => Promise<User>;
  logoutUser: () => Promise<void>;
  
  // Role helpers
  isAdmin: () => boolean;
  isManager: () => boolean;
  canWrite: () => boolean;
  canDelete: () => boolean;

  // Actions
  addNewVehicle: (v: Omit<Vehicle, 'id' | 'status'>) => Promise<any>;
  updateVehicleData: (plate: string, v: Partial<Vehicle>) => Promise<void>;
  removeVehicle: (plate: string) => Promise<void>;
  
  addNewStaff: (s: Omit<Staff, 'id' | 'status'>) => Promise<any>;
  updateStaffData: (id: string, s: Partial<Staff>) => Promise<void>;
  removeStaff: (id: string) => Promise<void>;

  addNewMission: (m: Omit<Mission, 'id' | 'num' | 'status'>) => Promise<any>;
  updateMissionData: (id: string, m: Partial<Mission>) => Promise<void>;
  closeMissionData: (id: string, returnMileage: number, status: 'Terminée' | 'Annulée', notes: string) => Promise<void>;

  addNewMaintenance: (mt: Omit<MaintenanceRecord, 'id' | 'status'>) => Promise<any>;
  updateMaintenanceData: (id: string, mt: Partial<MaintenanceRecord>) => Promise<void>;

  // GPS Tracking actions
  startGPSTracking: (missionId: string, vehicleId: string, driverId: string, lat: number, lng: number) => void;
  updateGPSPosition: (missionId: string, vehicleId: string, driverId: string, lat: number, lng: number) => void;
  stopGPSTrackingMission: (missionId: string) => void;

  // Mileage log action
  submitMileageLog: (data: Omit<MileageLog, 'id' | 'submittedAt'>) => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const data = localStorage.getItem('fleet_auth_user');
    return data ? JSON.parse(data) : {
      uid: 'u-admin',
      email: 'admin@fleet.com',
      role: 'Administrateur' as const,
      displayName: 'Admin FleetManager'
    };
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [personnel, setPersonnel] = useState<Staff[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [gpsTrackings, setGPSTrackings] = useState<GPSTracking[]>([]);
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Sync User auth session
  useEffect(() => {
    const unsub = onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        const defaultAdmin = {
          uid: 'u-admin',
          email: 'admin@fleet.com',
          role: 'Administrateur' as const,
          displayName: 'Admin FleetManager'
        };
        setUser(defaultAdmin);
        localStorage.setItem('fleet_auth_user', JSON.stringify(defaultAdmin));
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // 2. Setup Firestore Pub/Sub snapshot sync for instant updates
  useEffect(() => {
    const unsubVehicles = onSnapshot('vehicles', () => setVehicles(getVehicles()));
    const unsubPersonnel = onSnapshot('personnel', () => setPersonnel(getPersonnel()));
    const unsubMissions = onSnapshot('missions', () => setMissions(getMissions()));
    const unsubMaintenance = onSnapshot('maintenance', () => setMaintenance(getMaintenance()));
    const unsubLogs = onSnapshot('activityLogs', () => setActivityLogs(getActivityLogs()));
    const unsubGPS = onSnapshot('gpsTracking', () => setGPSTrackings(getGPSTrackings()));
    const unsubMileage = onSnapshot('mileageLogs', () => setMileageLogs(getMileageLogs()));

    return () => {
      unsubVehicles();
      unsubPersonnel();
      unsubMissions();
      unsubMaintenance();
      unsubLogs();
      unsubGPS();
      unsubMileage();
    };
  }, []);

  // Auth wrappers
  const loginUser = async (email: string, pass: string) => {
    return await signInWithEmailAndPassword(email, pass);
  };

  const logoutUser = async () => {
    await signOut();
  };

  // Role permissions checks
  const isAdmin = () => user?.role === 'Administrateur';
  const isManager = () => user?.role === 'Gestionnaire';
  const canWrite = () => user?.role === 'Administrateur' || user?.role === 'Gestionnaire';
  const canDelete = () => user?.role === 'Administrateur';

  // --- ACTIONS ---

  // Vehicles CRUD
  const addNewVehicle = async (v: Omit<Vehicle, 'id' | 'status'>) => {
    const fresh = {
      ...v,
      plate: v.plate.toUpperCase().trim(),
      status: 'Disponible' as const,
      statusChangedDate: new Date().toISOString().split('T')[0]
    };
    return await addDoc('vehicles', fresh);
  };

  const updateVehicleData = async (plate: string, v: Partial<Vehicle>) => {
    const current = vehicles.find(x => x.plate === plate);
    const updated = { ...v };
    if (v.status && (!current || current.status !== v.status)) {
      updated.statusChangedDate = new Date().toISOString().split('T')[0];
    }
    await updateDoc('vehicles', plate, updated);
  };

  const removeVehicle = async (plate: string) => {
    if (!canDelete()) return;
    await deleteDoc('vehicles', plate);
  };

  // Personnel CRUD
  const addNewStaff = async (s: Omit<Staff, 'id' | 'status'>) => {
    const fresh = {
      ...s,
      status: 'Disponible' as const
    };
    return await addDoc('personnel', fresh);
  };

  const updateStaffData = async (id: string, s: Partial<Staff>) => {
    await updateDoc('personnel', id, s);
  };

  const removeStaff = async (id: string) => {
    if (!canDelete()) return;
    await deleteDoc('personnel', id);
  };

  // Missions workflow
  const addNewMission = async (m: Omit<Mission, 'id' | 'num' | 'status'>) => {
    const missionNum = `MS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const fresh = {
      ...m,
      num: missionNum,
      status: 'En attente' as const
    };
    return await addDoc('missions', fresh);
  };

  const updateMissionData = async (id: string, m: Partial<Mission>) => {
    if (m.status === 'En cours') {
      const activeMission = missions.find(x => x.id === id);
      if (activeMission) {
        await updateDoc('vehicles', activeMission.vehicleId, { 
          status: 'En mission',
          statusChangedDate: new Date().toISOString().split('T')[0]
        });
        await updateDoc('personnel', activeMission.personnelId, { status: 'Mission' });
      }
    }
    await updateDoc('missions', id, m);
  };

  const closeMissionData = async (id: string, returnMileage: number, status: 'Terminée' | 'Annulée', notes: string) => {
    const mission = missions.find(x => x.id === id);
    if (!mission) return;

    await updateDoc('vehicles', mission.vehicleId, { 
      status: 'Disponible',
      mileage: returnMileage,
      statusChangedDate: new Date().toISOString().split('T')[0]
    });
    await updateDoc('personnel', mission.personnelId, { status: 'Disponible' });
    await updateDoc('missions', id, { 
      status, 
      notes: notes || mission.notes 
    });

    // Auto-stop GPS tracking when mission closes
    removeGPSTracking(id);
  };

  // Maintenance CRUD
  const addNewMaintenance = async (mt: Omit<MaintenanceRecord, 'id' | 'status'>) => {
    const fresh = {
      ...mt,
      status: 'Prévue' as const
    };
    return await addDoc('maintenance', fresh);
  };

  const updateMaintenanceData = async (id: string, mt: Partial<MaintenanceRecord>) => {
    const record = maintenance.find(x => x.id === id);
    
    if (record) {
      if (mt.status === 'En cours') {
        await updateDoc('vehicles', record.vehicleId, { 
          status: 'Maintenance',
          statusChangedDate: new Date().toISOString().split('T')[0]
        });
      } else if (mt.status === 'Terminée') {
        await updateDoc('vehicles', record.vehicleId, { 
          status: 'Disponible',
          lastMaint: new Date().toISOString().split('T')[0],
          statusChangedDate: new Date().toISOString().split('T')[0]
        });
      }
    }
    
    await updateDoc('maintenance', id, mt);
  };

  // --- GPS TRACKING ACTIONS ---
  const startGPSTracking = (missionId: string, vehicleId: string, driverId: string, lat: number, lng: number) => {
    upsertGPSTracking({
      missionId,
      vehicleId,
      driverId,
      lat,
      lng,
      timestamp: new Date().toISOString(),
      trackingStatus: 'actif'
    });
  };

  const updateGPSPosition = (missionId: string, vehicleId: string, driverId: string, lat: number, lng: number) => {
    upsertGPSTracking({
      missionId,
      vehicleId,
      driverId,
      lat,
      lng,
      timestamp: new Date().toISOString(),
      trackingStatus: 'actif'
    });
  };

  const stopGPSTrackingMission = (missionId: string) => {
    stopGPSTracking(missionId);
  };

  // --- MILEAGE LOG ACTION ---
  const submitMileageLog = (data: Omit<MileageLog, 'id' | 'submittedAt'>) => {
    addMileageLog(data);
  };

  return (
    <AppContext.Provider value={{
      user,
      vehicles,
      personnel,
      missions,
      maintenance,
      activityLogs,
      gpsTrackings,
      mileageLogs,
      activeTab,
      setActiveTab,
      loading,
      loginUser,
      logoutUser,
      isAdmin,
      isManager,
      canWrite,
      canDelete,
      addNewVehicle,
      updateVehicleData,
      removeVehicle,
      addNewStaff,
      updateStaffData,
      removeStaff,
      addNewMission,
      updateMissionData,
      closeMissionData,
      addNewMaintenance,
      updateMaintenanceData,
      startGPSTracking,
      updateGPSPosition,
      stopGPSTrackingMission,
      submitMileageLog
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
