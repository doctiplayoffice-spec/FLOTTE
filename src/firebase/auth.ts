// Mock Firebase Auth implementation

export interface User {
  uid: string;
  email: string;
  role: 'Administrateur' | 'Gestionnaire' | 'Consultation';
  displayName: string;
}

const PRESET_USERS: Record<string, Omit<User, 'email'>> = {
  'admin@fleet.com': { uid: 'u-admin', role: 'Administrateur', displayName: 'Gabriel Moreau (Admin)' },
  'manager@fleet.com': { uid: 'u-manager', role: 'Gestionnaire', displayName: 'Lucas Petit (Gestionnaire)' },
  'viewer@fleet.com': { uid: 'u-viewer', role: 'Consultation', displayName: 'Sofia Simon (Technicien)' },
};

const PASSWORDS: Record<string, string> = {
  'admin@fleet.com': 'admin123',
  'manager@fleet.com': 'manager123',
  'viewer@fleet.com': 'viewer123',
};

// Listeners list
let authListeners: ((user: User | null) => void)[] = [];

// Get active session from LocalStorage
const getSessionUser = (): User | null => {
  const data = localStorage.getItem('fleet_auth_user');
  return data ? JSON.parse(data) : null;
};

export const signInWithEmailAndPassword = async (email: string, pass: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const trimmedEmail = email.trim().toLowerCase();
      const userDetails = PRESET_USERS[trimmedEmail];
      const correctPass = PASSWORDS[trimmedEmail];

      if (userDetails && correctPass === pass) {
        const loggedUser: User = {
          email: trimmedEmail,
          ...userDetails
        };
        localStorage.setItem('fleet_auth_user', JSON.stringify(loggedUser));
        
        // Notify listeners
        authListeners.forEach(listener => listener(loggedUser));
        resolve(loggedUser);
      } else {
        reject(new Error("Identifiants incorrects. Veuillez utiliser admin@fleet.com, manager@fleet.com, ou viewer@fleet.com."));
      }
    }, 400);
  });
};

export const signOut = async (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      localStorage.removeItem('fleet_auth_user');
      authListeners.forEach(listener => listener(null));
      resolve();
    }, 200);
  });
};

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  authListeners.push(callback);
  
  // Trigger initial callback with current state immediately
  callback(getSessionUser());

  // Return unsubscribe function
  return () => {
    authListeners = authListeners.filter(l => l !== callback);
  };
};

export const getCurrentUser = (): User | null => {
  return getSessionUser();
};
