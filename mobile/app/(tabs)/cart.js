import { Image } from 'expo-image';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { imageSource } from '../../src/lib/image';
import TotalsCard from '../../src/components/TotalsCard';
import { Button, Card, Empty, QtyStepper } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useCart } from '../../src/context/CartContext';
import { minQty, nextSlab, unitPrice } from '../../src/lib/pricing';
import { colors, inr, radius } from '../../src/theme';

export default function Cart() {
  const { isDealer } = useAuth();
  const { lines, totals, setQty, belowMoq } = useCart();
  const tint = isDealer ? colors.dealer : colors.primary;
  const slab = isDealer ? nextSlab(totals.subtotal) : null;

  if (!lines.length) {
    return (
      <Empty
        icon="cart-outline"
        title="Your cart is empty"
        subtitle={isDealer ? 'Add products in bulk to place a wholesale order.' : 'Browse purifiers, filters and spares.'}
        action={<Button title={isDealer ? 'Open bulk order sheet' : 'Start shopping'} color={tint} onPress={() => router.push(isDealer ? '/bulk-order' : '/(tabs)')} />}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={lines}
        keyExtractor={(l) => l.product.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListHeaderComponent={
          slab ? (
            <View style={styles.slab}>
              <Text style={{ color: colors.dealer, fontWeight: '700' }}>
                Add {inr(slab.remaining)} more to unlock an extra {slab.rate * 100}% bulk discount
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item: { product: p, qty } }) => {
          const min = minQty(p, isDealer);
          const short = qty < min;
          return (
            <Card style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
              <Pressable onPress={() => router.push(`/product/${p.id}`)}>
                <Image source={imageSource(p.image)} style={styles.img} contentFit="contain" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={2}>{p.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  {inr(unitPrice(p, isDealer))} each{isDealer ? ` · MOQ ${p.moq}` : ''}
                </Text>
                {short ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 2 }}>Minimum {min} units for dealer orders</Text> : null}
                <View style={styles.lineBottom}>
                  <QtyStepper compact value={qty} min={1} max={p.stock || 1} onChange={(v) => setQty(p.id, v)} />
                  <Text style={styles.lineTotal}>{inr(unitPrice(p, isDealer) * qty)}</Text>
                </View>
              </View>
            </Card>
          );
        }}
        ListFooterComponent={<View style={{ marginTop: 4 }}><TotalsCard totals={totals} isDealer={isDealer} /></View>}
      />
      <View style={styles.bar}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Total</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>{inr(totals.total)}</Text>
        </View>
        <Button
          title={belowMoq.length ? 'Meet MOQ to continue' : 'Checkout'}
          icon="arrow-forward"
          disabled={!!belowMoq.length}
          color={tint}
          style={{ flex: 1.3 }}
          onPress={() => router.push('/checkout')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  img: { width: 76, height: 76, borderRadius: radius.sm, backgroundColor: '#fff' },
  name: { fontWeight: '700', color: colors.text },
  lineBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  lineTotal: { fontWeight: '800', color: colors.text },
  slab: { backgroundColor: colors.dealerSoft, borderRadius: radius.md, padding: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border },
});
