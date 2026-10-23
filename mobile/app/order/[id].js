import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Button, Card, Empty, Loading, Row, SectionTitle } from '../../src/components/ui';
import { useCart } from '../../src/context/CartContext';
import { update, watchDoc } from '../../src/backend';
import { useProducts } from '../../src/context/ProductsContext';
import { fmtDate } from '../../src/hooks/useMyDocs';
import { formatAddress } from '../../src/lib/geo';
import { imageSource } from '../../src/lib/image';
import { colors, inr } from '../../src/theme';

const STEPS = [
  { key: 'placed', label: 'Order placed', icon: 'receipt' },
  { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-done' },
  { key: 'shipped', label: 'Shipped', icon: 'car' },
  { key: 'delivered', label: 'Delivered', icon: 'home' },
];

export default function OrderDetail() {
  const { id, fresh } = useLocalSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { add } = useCart();
  const { byId } = useProducts();

  useEffect(() => watchDoc('orders', id, (o) => {
    setOrder(o);
    setLoading(false);
  }, () => setLoading(false)), [id]);

  if (loading) return <Loading />;
  if (!order) return <Empty title="Order not found" />;

  const cancelled = order.status === 'cancelled';
  const stepIdx = STEPS.findIndex((s) => s.key === order.status);
  const at = (k) => order.statusHistory?.find((h) => h.status === k)?.at;
  const isDealer = order.channel === 'dealer';
  const tint = isDealer ? colors.dealer : colors.primary;

  const cancel = () => Alert.alert('Cancel order?', 'This cannot be undone.', [
    { text: 'Keep order' },
    {
      text: 'Cancel order',
      style: 'destructive',
      onPress: () => update('orders', id, {
        status: 'cancelled',
        statusHistory: [...(order.statusHistory || []), { status: 'cancelled', at: new Date().toISOString(), by: 'customer' }],
        updatedAt: 'now',
      }).catch((e) => Alert.alert('Error', e.message)),
    },
  ]);

  const reorder = () => {
    order.items.forEach((it) => byId[it.productId] && add(byId[it.productId], it.qty));
    router.push('/(tabs)/cart');
  };

  const hasPurifier = order.items.some((i) => i.category === 'Purifiers');

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {fresh ? (
        <View style={styles.success}>
          <Ionicons name="checkmark-circle" size={28} color={colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: colors.success, fontSize: 16 }}>Thank you! Order placed.</Text>
            <Text style={{ color: colors.text, marginTop: 2 }}>We've sent a confirmation notification.</Text>
          </View>
        </View>
      ) : null}

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.no}>#{order.orderNo}</Text>
            <Text style={{ color: colors.muted, marginTop: 2 }}>{fmtDate(order.createdAt)}</Text>
          </View>
          <Badge status={order.status} />
        </View>

        {cancelled ? (
          <Text style={{ color: colors.danger, marginTop: 14, fontWeight: '600' }}>
            This order was cancelled{order.cancelReason ? `: ${order.cancelReason}` : '.'}
          </Text>
        ) : (
          <View style={{ marginTop: 18 }}>
            {STEPS.map((s, i) => {
              const done = i <= stepIdx;
              return (
                <View key={s.key} style={styles.step}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={[styles.stepDot, done && { backgroundColor: tint }]}>
                      <Ionicons name={s.icon} size={14} color={done ? '#fff' : colors.muted} />
                    </View>
                    {i < STEPS.length - 1 ? <View style={[styles.stepLine, i < stepIdx && { backgroundColor: tint }]} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: 14 }}>
                    <Text style={[styles.stepLabel, !done && { color: colors.muted }]}>{s.label}</Text>
                    {at(s.key) ? <Text style={styles.stepAt}>{fmtDate(at(s.key))}</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        {order.tracking?.number ? (
          <View style={styles.tracking}>
            <Ionicons name="cube-outline" size={18} color={tint} />
            <Text style={{ color: colors.text }}>{order.tracking.carrier || 'Courier'} · {order.tracking.number}</Text>
          </View>
        ) : null}
      </Card>

      <SectionTitle style={{ marginTop: 20 }}>Items</SectionTitle>
      <Card style={{ gap: 12 }}>
        {order.items.map((it) => (
          <View key={it.productId} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Image source={imageSource(it.image)} style={styles.img} contentFit="contain" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: colors.text }} numberOfLines={2}>{it.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{it.qty} × {inr(it.price)}</Text>
            </View>
            <Text style={{ fontWeight: '800', color: colors.text }}>{inr(it.qty * it.price)}</Text>
          </View>
        ))}
      </Card>

      <SectionTitle style={{ marginTop: 20 }}>Payment</SectionTitle>
      <Card>
        <Row label="Subtotal" value={inr(order.subtotal)} />
        {order.discount ? <Row label="Bulk discount" value={'-' + inr(order.discount)} color={colors.success} /> : null}
        <Row label="Delivery" value={order.shipping ? inr(order.shipping) : 'FREE'} />
        <Row label="Total" value={inr(order.total)} bold />
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
        <Row
          label="Method"
          value={order.payment?.method === 'razorpay' ? 'Razorpay (online)' : order.payment?.method === 'credit' ? 'Dealer credit' : 'Cash on delivery'}
        />
        <Row label="Status" value={order.payment?.status} color={order.payment?.status === 'paid' ? colors.success : colors.warning} />
        {order.payment?.razorpayPaymentId ? <Row label="Payment ID" value={order.payment.razorpayPaymentId} /> : null}
      </Card>

      <SectionTitle style={{ marginTop: 20 }}>Delivery address</SectionTitle>
      <Card>
        <Text style={{ fontWeight: '700', color: colors.text }}>{order.customerName}{order.businessName ? ` · ${order.businessName}` : ''}</Text>
        <Text style={{ color: colors.text, marginTop: 4, lineHeight: 20 }}>{formatAddress(order.address)}</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>{order.customerPhone}</Text>
      </Card>

      <View style={{ gap: 10, marginTop: 20 }}>
        {hasPurifier && order.status === 'delivered' ? (
          <Button title="Book free installation" icon="construct-outline" color={tint} onPress={() => router.push({ pathname: '/(tabs)/service', params: { type: 'Installation', product: order.items.find((i) => i.category === 'Purifiers').name } })} />
        ) : null}
        <Button title="Order again" icon="repeat" variant="outline" color={tint} onPress={reorder} />
        {['placed', 'confirmed'].includes(order.status) ? <Button title="Cancel order" variant="danger" onPress={cancel} /> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  success: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.successSoft, padding: 14, borderRadius: 14, marginBottom: 14 },
  no: { fontSize: 18, fontWeight: '900', color: colors.text },
  step: { flexDirection: 'row', gap: 12 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepLine: { width: 2, flex: 1, backgroundColor: colors.border, minHeight: 18 },
  stepLabel: { fontWeight: '700', color: colors.text, marginTop: 4 },
  stepAt: { color: colors.muted, fontSize: 12, marginTop: 2 },
  tracking: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.bg, padding: 10, borderRadius: 10 },
  img: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
});
