import { add, getIdToken, isDemo } from '../backend';
import { API_BASE } from '../config';

/**
 * Notify the signed-in user about their own order / service ticket.
 * The Vercel function sends FCM push + SMS + email and writes the inbox entry.
 * If the API isn't configured or is unreachable (or in the offline demo),
 * write the inbox entry directly so the notification still appears.
 */
export async function notifySelf(userId, { title, body, data = {}, channels = ['push', 'email', 'sms'] }) {
  if (!userId) return;
  if (API_BASE && !isDemo) {
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, title, body, data, channels }),
      });
      if (res.ok) return;
    } catch {
      // fall through to the direct write
    }
  }
  await add('notifications', { userId, title, body, data, read: false, createdAt: 'now' }).catch(() => {});
}
