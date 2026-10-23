import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Button, Card } from '../../src/components/ui';
import { SUPPORT_PHONE } from '../../src/config';
import { useAuth } from '../../src/context/AuthContext';
import { fmtDate, useMyDocs } from '../../src/hooks/useMyDocs';
import { formatAddress } from '../../src/lib/geo';
import { colors, inr, radius } from '../../src/theme';

function Item({ icon, label, sub, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.item}>
      <Ionicons name={icon} size={20} color={colors.text} />
      <View style={{ flex: 1 }}>
        <Text style={styles.itemLabel}>{label}</Text>
        {sub ? <Text style={styles.itemSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

export default function Profile() {
  const { profile, isDealer, isDemo, signOut } = useAuth();
  const { docs: orders } = useMyDocs('orders');
  const { docs: notes } = useMyDocs('notifications');
  const tint = isDealer ? colors.dealer : colors.primary;
  const spent = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0);
  const unread = notes.filter((n) => !n.read).length;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <View style={[styles.avatar, { backgroundColor: tint }]}>
          <Text style={styles.avatarText}>{(profile?.name || '?').slice(0, 1).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{profile?.name}</Text>
        <Text style={{ color: colors.muted, marginTop: 2 }}>{profile?.email}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Badge status={isDealer ? 'pending' : 'confirmed'} label={isDealer ? 'Dealer' : 'Customer'} />
          {isDealer ? <Badge status="approved" label="Verified" /> : null}
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statV}>{orders.length}</Text>
            <Text style={styles.statL}>Orders</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statV}>{inr(spent)}</Text>
            <Text style={styles.statL}>{isDealer ? 'Purchases' : 'Spent'}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statV}>{profile?.createdAt ? fmtDate(profile.createdAt, false).split(' ').slice(1).join(' ') : '-'}</Text>
            <Text style={styles.statL}>Member since</Text>
          </View>
        </View>
      </Card>

      {isDealer ? (
        <Card style={{ marginTop: 14, backgroundColor: colors.dealerSoft }}>
          <Text style={{ fontWeight: '800', color: colors.dealer, marginBottom: 6 }}>Business</Text>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{profile?.businessName}</Text>
          <Text style={{ color: colors.text, marginTop: 2 }}>GSTIN: {profile?.gstin || 'Not provided'}</Text>
        </Card>
      ) : null}

      <Card style={{ marginTop: 14, padding: 0 }}>
        <Item icon="person-outline" label="Edit profile" sub={profile?.phone} onPress={() => router.push('/edit-profile')} />
        <Item icon="location-outline" label="Saved address" sub={formatAddress(profile?.address) || 'Add an address'} onPress={() => router.push('/edit-profile')} />
        <Item icon="notifications-outline" label="Notifications" sub={unread ? `${unread} unread` : 'All caught up'} onPress={() => router.push('/notifications')} />
        <Item icon="receipt-outline" label="Order history" onPress={() => router.push('/(tabs)/orders')} />
        {isDealer ? <Item icon="layers-outline" label="Bulk order sheet" onPress={() => router.push('/bulk-order')} /> : null}
        <Item icon="construct-outline" label="Service requests" onPress={() => router.push('/(tabs)/service')} />
        <Item icon="call-outline" label="Customer care" sub={SUPPORT_PHONE} onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`)} />
      </Card>

      {isDemo ? (
        <Card style={{ marginTop: 14, backgroundColor: colors.warningSoft }}>
          <Text style={{ fontWeight: '800', color: colors.warning }}>Demo mode</Text>
          <Text style={{ color: colors.text, marginTop: 4, lineHeight: 20 }}>
            Data is stored on this phone. The store team is simulated: new orders are confirmed in ~15 s, shipped and delivered
            shortly after, service tickets get a technician in ~20 s, and pending dealers are approved in ~25 s. Each step sends a notification.
          </Text>
          <Button
            title="Reset demo data"
            variant="outline"
            color={colors.warning}
            style={{ marginTop: 12, height: 42 }}
            onPress={() => Alert.alert('Reset demo data?', 'All orders, tickets and new accounts on this phone will be cleared.', [
              { text: 'Cancel' },
              { text: 'Reset', style: 'destructive', onPress: () => require('../../src/backend/demo').resetDemo() },
            ])}
          />
        </Card>
      ) : null}

      <Button
        title="Sign out"
        variant="danger"
        icon="log-out-outline"
        style={{ marginTop: 20 }}
        onPress={() => Alert.alert('Sign out?', '', [{ text: 'Cancel' }, { text: 'Sign out', style: 'destructive', onPress: signOut }])}
      />
      <Text style={styles.ver}>PureFlow v1.0 · {isDemo ? 'Offline demo build' : 'Test payments only'}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '900' },
  name: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 12 },
  stats: { flexDirection: 'row', marginTop: 20, alignSelf: 'stretch', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 },
  stat: { flex: 1, alignItems: 'center' },
  statV: { fontWeight: '900', color: colors.text, fontSize: 15 },
  statL: { color: colors.muted, fontSize: 11, marginTop: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.bg },
  itemLabel: { fontWeight: '600', color: colors.text, fontSize: 15 },
  itemSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  ver: { textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 16 },
});
