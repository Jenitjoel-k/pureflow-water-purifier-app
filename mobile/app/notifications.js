import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { update, updateMany } from '../src/backend';
import { Button, Empty, Loading } from '../src/components/ui';
import { fmtDate, useMyDocs } from '../src/hooks/useMyDocs';
import { colors, radius } from '../src/theme';

const iconFor = (n) => (n.data?.orderId ? 'receipt' : n.data?.ticketId ? 'construct' : n.data?.dealer ? 'storefront' : 'notifications');

export default function Notifications() {
  const { docs, loading } = useMyDocs('notifications');
  const unread = docs.filter((n) => !n.read);

  const open = (n) => {
    if (!n.read) update('notifications', n.id, { read: true }).catch(() => {});
    if (n.data?.orderId) router.push(`/order/${n.data.orderId}`);
    else if (n.data?.ticketId) router.push('/(tabs)/service');
  };

  const markAll = () => updateMany('notifications', unread.map((n) => n.id), { read: true }).catch(() => {});

  if (loading) return <Loading />;
  if (!docs.length) return <Empty icon="notifications-outline" title="No notifications" subtitle="Order and service updates will show up here." />;

  return (
    <FlatList
      data={docs}
      keyExtractor={(n) => n.id}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      ListHeaderComponent={unread.length ? <Button title={`Mark ${unread.length} as read`} variant="ghost" onPress={markAll} style={{ alignSelf: 'flex-end', height: 36 }} /> : null}
      renderItem={({ item: n }) => (
        <Pressable onPress={() => open(n)} style={[styles.item, !n.read && styles.unread]}>
          <View style={styles.icon}>
            <Ionicons name={iconFor(n)} size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{n.title}</Text>
            <Text style={styles.body}>{n.body}</Text>
            <Text style={styles.at}>{fmtDate(n.createdAt)}</Text>
          </View>
          {!n.read ? <View style={styles.dot} /> : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: 12, padding: 14, backgroundColor: '#fff', borderRadius: radius.md },
  unread: { backgroundColor: '#F0FAFC', borderWidth: 1, borderColor: colors.primarySoft },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800', color: colors.text },
  body: { color: colors.text, marginTop: 2, lineHeight: 19 },
  at: { color: colors.muted, fontSize: 11, marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
});
