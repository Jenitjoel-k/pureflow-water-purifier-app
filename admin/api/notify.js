import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb, messaging } from './_firebase.js';

// POST /api/notify  { userId, title, body, data?, channels? }
// Authorization: Bearer <Firebase ID token>
//
// Admins may notify any user; everyone else may only notify themselves
// (e.g. the app's own "order placed" confirmation). Each channel is optional
// and is skipped when its credentials aren't configured.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const caller = await adminAuth.verifyIdToken(token);

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { userId, title, data = {} } = body;
    const message = String(body.body || '').slice(0, 500);
    const channels = Array.isArray(body.channels) ? body.channels : ['push', 'sms', 'email'];
    if (!userId || !title) return res.status(400).json({ error: 'userId and title are required' });

    if (caller.uid !== userId) {
      const callerDoc = await adminDb.doc(`users/${caller.uid}`).get();
      if (callerDoc.data()?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    }

    const userDoc = await adminDb.doc(`users/${userId}`).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    const user = userDoc.data();
    const stringData = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]));

    const result = {};

    // 1. In-app inbox (always).
    await adminDb.collection('notifications').add({
      userId, title, body: message, data, read: false, createdAt: FieldValue.serverTimestamp(),
    });
    result.inbox = 'ok';

    // 2. Firebase Cloud Messaging push.
    if (channels.includes('push')) {
      if (!user.fcmToken) result.push = 'no device token';
      else {
        try {
          await messaging.send({
            token: user.fcmToken,
            notification: { title, body: message },
            data: stringData,
            android: { priority: 'high', notification: { channelId: 'default', color: '#0E7490' } },
          });
          result.push = 'sent';
        } catch (e) {
          result.push = 'failed: ' + (e.code || e.message);
          if (e.code === 'messaging/registration-token-not-registered') {
            await adminDb.doc(`users/${userId}`).update({ fcmToken: FieldValue.delete() });
          }
        }
      }
    }

    // 3. SMS via TextBee (uses your Android phone as the gateway).
    if (channels.includes('sms')) {
      const { TEXTBEE_API_KEY, TEXTBEE_DEVICE_ID } = process.env;
      if (!TEXTBEE_API_KEY || !TEXTBEE_DEVICE_ID) result.sms = 'not configured';
      else if (!user.phone) result.sms = 'no phone';
      else {
        const phone = user.phone.startsWith('+') ? user.phone : `+91${user.phone.slice(-10)}`;
        const r = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': TEXTBEE_API_KEY },
          body: JSON.stringify({ recipients: [phone], message: `PureFlow: ${title}. ${message}`.slice(0, 300) }),
        });
        result.sms = r.ok ? 'sent' : `failed (${r.status})`;
      }
    }

    // 4. Email via EmailJS REST API.
    if (channels.includes('email')) {
      const { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY } = process.env;
      if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) result.email = 'not configured';
      else if (!user.email) result.email = 'no email';
      else {
        const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            accessToken: EMAILJS_PRIVATE_KEY,
            template_params: { to_email: user.email, to_name: user.name || 'Customer', title, message },
          }),
        });
        result.email = r.ok ? 'sent' : `failed (${r.status})`;
      }
    }

    return res.status(200).json(result);
  } catch (e) {
    const status = e.code?.startsWith?.('auth/') ? 401 : 500;
    return res.status(status).json({ error: e.message });
  }
}
