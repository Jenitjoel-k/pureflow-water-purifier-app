import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useCart } from '../../src/context/CartContext';
import { colors } from '../../src/theme';

const icon = (name) => ({ color, size, focused }) => (
  <Ionicons name={focused ? name : `${name}-outline`} size={size} color={color} />
);

export default function TabsLayout() {
  const { isDealer } = useAuth();
  const { count } = useCart();
  const tint = isDealer ? colors.dealer : colors.primary;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tint,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { height: 64, paddingBottom: 8, paddingTop: 6, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { fontWeight: '800' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Shop', headerShown: false, tabBarIcon: icon('water') }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: isDealer ? 'Bulk cart' : 'Cart',
          tabBarIcon: icon('cart'),
          tabBarBadge: count ? (count > 99 ? '99+' : count) : undefined,
          tabBarBadgeStyle: { backgroundColor: tint },
        }}
      />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: icon('receipt') }} />
      <Tabs.Screen name="service" options={{ title: 'Service', tabBarIcon: icon('construct') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
