import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { isDemo, update } from '../backend';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Orders & Service',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0E7490',
    });
  }
}

/**
 * Asks for permission and stores the native FCM device token on the user
 * document, so the server (/api/notify on Vercel) can push via Firebase Cloud
 * Messaging. Returns the token, or null when remote push is unavailable
 * (emulator, Expo Go, or missing google-services.json); in that case the app
 * falls back to local notifications driven by the Firestore inbox.
 */
export async function registerForPush(uid) {
  try {
    await ensureChannel();
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    // The offline demo has no server to push from; it uses local notifications.
    if (status !== 'granted' || !Device.isDevice || isDemo) return null;

    const token = await Notifications.getDevicePushTokenAsync();
    if (token?.type === 'android' && token.data) {
      await update('users', uid, { fcmToken: token.data, fcmUpdatedAt: new Date().toISOString() });
      return token.data;
    }
  } catch (e) {
    console.log('Remote push unavailable, using local notifications:', e?.message);
  }
  return null;
}

export function showLocal(title, body, data = {}) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: null,
  }).catch(() => {});
}
