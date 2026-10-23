import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, initializeFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth;
try {
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch {
  // Already initialised (fast refresh).
  auth = getAuth(app);
}

export { app, auth };
let firestore;
try {
  // Optional form fields may be undefined; drop them instead of failing the write.
  firestore = initializeFirestore(app, { ignoreUndefinedProperties: true });
} catch {
  firestore = getFirestore(app);
}
export const db = firestore;

// Local development against `firebase emulators:start` (set EXPO_PUBLIC_EMULATOR_HOST
// to your PC's LAN IP when testing on a phone).
if (process.env.EXPO_PUBLIC_EMULATOR_HOST && !globalThis.__pfEmulators) {
  globalThis.__pfEmulators = true;
  const host = process.env.EXPO_PUBLIC_EMULATOR_HOST;
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
}
