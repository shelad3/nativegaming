
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// These placeholders would be replaced by actual Firebase project credentials
// In this environment, we use these to scaffold the real logic.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Helper: Strip quotes if the user accidentally included them in .env
Object.keys(firebaseConfig).forEach(key => {
  const k = key as keyof typeof firebaseConfig;
  const val = firebaseConfig[k];
  if (typeof val === 'string' && (val.startsWith('"') || val.startsWith("'"))) {
    firebaseConfig[k] = val.replace(/^["']|["']$/g, '');
  }
});

const missingKeys = Object.entries(firebaseConfig)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.error('Missing Firebase configuration keys:', missingKeys);
} else {
  console.log('Firebase configuration loaded successfully.');
}

// Safe initialization
let app: any;
let auth: any;
let db: any;
let storage: any;

try {
  if (missingKeys.length > 0) {
    throw new Error(`Missing keys: ${missingKeys.join(', ')}`);
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error("FIREBASE INITIALIZATION FAILED:", error);
  // Mock objects to prevent import crashes
  const mockParams = { apiKey: null }; // Trigger checking in Auth.tsx
  auth = { app: { options: mockParams }, currentUser: null };
  app = { options: mockParams };
  db = {};
  storage = {};
}

export { app, auth, db, storage };
export default app;