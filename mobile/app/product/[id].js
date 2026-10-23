import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { imageSource } from '../../src/lib/image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Empty, PriceTag, QtyStepper } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { useCart } from '../../src/context/CartContext';
import { useProducts } from '../../src/context/ProductsContext';
import { minQty } from '../../src/lib/pricing';
import { colors, inr, radius } from '../../src/theme';

export default function ProductDetail() {
  const { id } = useLocalSearchParams();
  const { byId, loading } = useProducts();
  const { isDealer } = useAuth();
  const { add, qtyOf } = useCart();
  const p = byId[id];
  const min = p ? minQty(p, isDealer) : 1;
  const [qty, setQty] = useState(min);
  const tint = isDealer ? colors.dealer : colors.primary;

  useEffect(() => setQty(min), [min]);

  if (!p) return loading ? null : <Empty title="Product not found" />;

  const inCart = qtyOf(p.id);
  const lowStock = p.stock > 0 && p.stock < 10;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <Stack.Screen options={{ title: p.category }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.imgWrap}>
          <Image source={imageSource(p.image)} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={250} />
        </View>
        <View style={{ padding: 16 }}>
          <Text style={styles.name}>{p.name}</Text>
          <View style={styles.meta}>
            <View style={styles.rating}>
              <Ionicons name="star" size={13} color="#fff" />
              <Text style={styles.ratingText}>{p.rating?.toFixed(1)}</Text>
            </View>
            <Text style={{ color: p.stock ? (lowStock ? colors.warning : colors.success) : colors.danger, fontWeight: '700' }}>
              {p.stock ? (lowStock ? `Only ${p.stock} left` : 'In stock') : 'Out of stock'}
            </Text>
          </View>

          <View style={{ marginTop: 12 }}>
            <PriceTag product={p} isDealer={isDealer} size="lg" />
            <Text style={styles.tax}>{isDealer ? 'Wholesale price · ' : ''}Inclusive of all taxes</Text>
          </View>

          {isDealer ? (
            <View style={styles.dealerBox}>
              <Ionicons name="pricetags" size={18} color={colors.dealer} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: colors.dealer }}>Dealer terms</Text>
                <Text style={{ color: colors.text, marginTop: 2 }}>
                  Minimum order {p.moq} units · Retail {inr(p.price)} · Your margin {inr(p.price - p.dealerPrice)}/unit
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.perks}>
              {[['car-outline', 'Free delivery above ₹999'], ['construct-outline', 'Free installation on purifiers'], ['shield-checkmark-outline', `${p.specs?.Warranty || '6 months'} warranty`]].map(([icon, t]) => (
                <View key={t} style={styles.perk}>
                  <Ionicons name={icon} size={16} color={colors.primary} />
                  <Text style={styles.perkText}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          <Card style={{ marginTop: 16 }}>
            <Text style={styles.h}>About this item</Text>
            <Text style={styles.desc}>{p.description}</Text>
          </Card>

          {p.specs ? (
            <Card style={{ marginTop: 12 }}>
              <Text style={styles.h}>Specifications</Text>
              {Object.entries(p.specs).map(([k, v], i) => (
                <View key={k} style={[styles.spec, i % 2 === 0 && { backgroundColor: colors.bg }]}>
                  <Text style={styles.specK}>{k}</Text>
                  <Text style={styles.specV}>{v}</Text>
                </View>
              ))}
            </Card>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.bar}>
        <QtyStepper value={qty} min={min} max={p.stock || 1} onChange={(v) => setQty(Math.max(v, min))} />
        <Button
          title={p.stock ? (inCart ? `Add ${qty} more` : `Add ${qty} · ${inr((isDealer ? p.dealerPrice : p.price) * qty)}`) : 'Out of stock'}
          disabled={!p.stock}
          color={tint}
          style={{ flex: 1, marginLeft: 12 }}
          onPress={() => {
            add(p, qty);
            router.push('/(tabs)/cart');
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  imgWrap: { backgroundColor: '#fff', height: 320, padding: 16 },
  name: { fontSize: 22, fontWeight: '900', color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  rating: { flexDirection: 'row', gap: 3, alignItems: 'center', backgroundColor: colors.success, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  ratingText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  tax: { color: colors.muted, fontSize: 12, marginTop: 2 },
  dealerBox: { flexDirection: 'row', gap: 10, backgroundColor: colors.dealerSoft, padding: 14, borderRadius: radius.md, marginTop: 14 },
  perks: { marginTop: 14, gap: 8 },
  perk: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  perkText: { color: colors.text },
  h: { fontWeight: '800', fontSize: 15, color: colors.text, marginBottom: 8 },
  desc: { color: colors.text, lineHeight: 21 },
  spec: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 6 },
  specK: { flex: 1, color: colors.muted },
  specV: { flex: 1.3, color: colors.text, fontWeight: '600' },
  bar: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border },
});
