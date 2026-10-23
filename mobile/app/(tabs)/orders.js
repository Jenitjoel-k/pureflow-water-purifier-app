import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { imageSource } from '../../src/lib/image';
import { Badge, Button, Card, Empty, Loading } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { fmtDate, useMyDocs } from '../../src/hooks/useMyDocs';
import { colors, inr } from '../../src/theme';

export default function Orders() {
  const { isDealer } = useAuth();
  const { docs, loading } = useMyDocs('orders');

  if (loading) return <Loading />;
  if (!docs.length) {
    return (
      <Empty
        icon="receipt-outline"
        title="No orders yet"
        subtitle="Your order history will appear here."
        action={<Button title="Browse products" color={isDealer ? colors.dealer : colors.primary} onPress={() => router.push('/(tabs)')} />}
      />
    );
  }

  return (
    <FlatList
      data={docs}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      renderItem={({ item: o }) => (
        <Pressable onPress={() => router.push(`/order/${o.id}`)}>
          <Card>
            <View style={styles.head}>
              <View>
                <Text style={styles.no}>#{o.orderNo}</Text>
                <Text style={styles.date}>{fmtDate(o.createdAt)}</Text>
              </View>
              <Badge status={o.status} />
            </View>
            <View style={styles.thumbs}>
              {o.items.slice(0, 4).map((it) => (
                <Image key={it.productId} source={imageSource(it.image)} style={styles.thumb} contentFit="contain" />
              ))}
              {o.items.length > 4 ? <Text style={styles.more}>+{o.items.length - 4}</Text> : null}
            </View>
            <View style={styles.foot}>
              <Text style={{ color: colors.muted }}>
                {o.itemCount} unit{o.itemCount > 1 ? 's' : ''}{o.channel === 'dealer' ? ' · Bulk' : ''} · {o.payment?.method === 'razorpay' ? 'Paid online' : o.payment?.method === 'credit' ? 'Credit' : 'COD'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.total}>{inr(o.total)}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </View>
            </View>
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  no: { fontWeight: '800', color: colors.text, fontSize: 15 },
  date: { color: colors.muted, fontSize: 12, marginTop: 2 },
  thumbs: { flexDirection: 'row', gap: 8, marginVertical: 12, alignItems: 'center' },
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  more: { color: colors.muted, fontWeight: '700' },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontWeight: '900', color: colors.text, fontSize: 16 },
});
