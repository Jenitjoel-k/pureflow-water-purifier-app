import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// FIREBASE_SERVICE_ACCOUNT holds the service-account JSON, either raw or base64.
function credentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  return cert(JSON.parse(json));
}

const app = getApps()[0] || initializeApp({ credential: credentials() });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const messaging = getMessaging(app);
