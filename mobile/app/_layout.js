import * as Notifications from 'expo-notifications';
import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { watchMine } from '../src/backend';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { CartProvider } from '../src/context/CartContext';
import { ProductsProvider } from '../src/context/ProductsContext';
import { registerForPush, showLocal } from '../src/lib/notifications';
import { colors } from '../src/theme';

function Gate() {
  const { user, profile, loading, signOut } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    const onDealerStatus = segments[0] === 'dealer-status';

    if (!user) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }
    if (!profile) return; // profile doc is being created right after sign-up
    if (profile.role === 'admin') {
      signOut();
      return;
    }
    if (profile.role === 'dealer' && profile.dealerStatus !== 'approved') {
      if (!onDealerStatus) router.replace('/dealer-status');
      return;
    }
    if (inAuth || onDealerStatus || !segments[0]) router.replace('/(tabs)');
  }, [user, profile, loading, segments]);

  return null;
}

// Registers the FCM token and mirrors the Firestore notification inbox into
// local notifications when remote push isn't available (e.g. Expo Go).
function NotificationBridge() {
  const { user } = useAuth();
  const hasPush = useRef(false);

  useEffect(() => {
    if (!user) return undefined;
    let seen = null;
    registerForPush(user.uid).then((t) => (hasPush.current = !!t));
    const unsub = watchMine('notifications', user.uid, (rows) => {
      if (seen && !hasPush.current) {
        rows.filter((n) => !seen.has(n.id)).forEach((n) => showLocal(n.title, n.body, n.data));
      }
      seen = new Set(rows.map((n) => n.id));
    });
    const tap = Notifications.addNotificationResponseReceivedListener((r) => {
      const d = r.notification.request.content.data || {};
      if (d.orderId) router.push(`/order/${d.orderId}`);
      else if (d.ticketId) router.push('/(tabs)/service');
      else router.push('/notifications');
    });
    return () => {
      unsub();
      tap.remove();
    };
  }, [user]);

  return null;
}

function Root() {
  const { loading } = useAuth();
  return (
    <>
      <Gate />
      <NotificationBridge />
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: '' }} />
        <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
        <Stack.Screen name="order/[id]" options={{ title: 'Order details' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="bulk-order" options={{ title: 'Bulk order' }} />
        <Stack.Screen name="edit-profile" options={{ title: 'Edit profile' }} />
        <Stack.Screen name="dealer-status" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
      {loading ? (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
    </>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ProductsProvider>
          <CartProvider>
            <Root />
          </CartProvider>
        </ProductsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
