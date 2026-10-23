import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

/**
 * Notify a user via the /api/notify serverless function (FCM push + SMS +
 * email + inbox entry). Falls back to writing the inbox entry directly so the
 * app still shows it when the function isn't configured (e.g. `vite dev`).
 * Returns a short summary of which channels were delivered.
 */
export async function notifyUser(userId, title, body, data = {}, channels = ['push', 'sms', 'email']) {
  try {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, title, body, data, channels }),
    });
    if (res.ok) return await res.json();
  } catch {
    // fall back below
  }
  await addDoc(collection(db, 'notifications'), { userId, title, body, data, read: false, createdAt: serverTimestamp() });
  return { inbox: 'ok', push: 'skipped (api unavailable)' };
}

export const summarize = (r) =>
  Object.entries(r || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');
