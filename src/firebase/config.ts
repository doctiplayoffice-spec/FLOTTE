// Mock Firebase Config and DB Initializer
export const firebaseConfig = {
  apiKey: "mock-api-key",
  authDomain: "mock-fleet-manager.firebaseapp.com",
  projectId: "mock-fleet-manager",
  storageBucket: "mock-fleet-manager.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456:web:abcd"
};

export const initializeMockApp = () => {
  console.log("Mock Firebase App initialized successfully with config:", firebaseConfig.projectId);
};
