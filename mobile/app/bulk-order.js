import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { imageSource } from '../src/lib/image';
import { Button, Chip } from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { useCart } from '../src/context/CartContext';
import { CATEGORIES, useProducts } from '../src/context/ProductsContext';
import { bulkRate, computeTotals } from '../src/lib/pricing';
import { colors, inr } from '../src/theme';

// Spreadsheet-style order sheet for dealers: type quantities for many SKUs at
// once and push them all into the cart.
export default function BulkOrder() {
  const { isDealer } = useAuth();
  const { products } = useProducts();
  const { qtyOf, setQty } = useCart();
  const [cat, setCat] = useState('All');
  const [draft, setDraft] = useState(() => Object.fromEntries(products.map((p) => [p.id, qtyOf(p.id) ? String(qtyOf(p.id)) : ''])));

  const sections = useMemo(
    () => CATEGORIES.filter((c) => cat === 'All' || c === cat)
      .map((c) => ({ title: c, data: products.filter((p) => p.category === c) }))
      .filter((s) => s.data.length),
    [products, cat],
  );

  const lines = products.filter((p) => +draft[p.id] > 0).map((p) => ({ product: p, qty: +draft[p.id] }));
  const totals = computeTotals(lines, true);
  const invalid = lines.filter((l) => l.qty < l.product.moq || l.qty > l.product.stock);

  if (!isDealer) return null;

  const apply = () => {
    if (invalid.length) {
      return Alert.alert('Check quantities', invalid.map((l) => `${l.product.name}: MOQ ${l.product.moq}, stock ${l.product.stock}`).join('\n'));
    }
    products.forEach((p) => setQty(p.id, +draft[p.id] || 0));
    router.replace('/(tabs)/cart');
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['All', ...CATEGORIES].map((c) => <Chip key={c} label={c} active={cat === c} onPress={() => setCat(c)} color={colors.dealer} />)}
        </ScrollView>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(p) => p.id}
        stickySectionHeadersEnabled
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item: p }) => {
          const v = draft[p.id] || '';
          const bad = v && (+v < p.moq || +v > p.stock);
          return (
            <View style={styles.row}>
              <Image source={imageSource(p.image)} style={styles.img} contentFit="contain" />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.meta}>{inr(p.dealerPrice)} · MOQ {p.moq} · Stock {p.stock}</Text>
              </View>
              <TextInput
                value={v}
                onChangeText={(t) => setDraft((d) => ({ ...d, [p.id]: t.replace(/\D/g, '') }))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#94A3B8"
                style={[styles.qty, v && { borderColor: colors.dealer }, bad && { borderColor: colors.danger, color: colors.danger }]}
              />
            </View>
          );
        }}
      />
      <View style={styles.bar}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {lines.length} SKUs · {lines.reduce((s, l) => s + l.qty, 0)} units{bulkRate(totals.subtotal) ? ` · ${bulkRate(totals.subtotal) * 100}% slab` : ''}
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.dealer }}>{inr(totals.total)}</Text>
        </View>
        <Button title="Update cart" icon="cart" color={colors.dealer} onPress={apply} disabled={!lines.length} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: colors.bg, paddingVertical: 8, fontWeight: '900', color: colors.dealer, textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', padding: 10, borderRadius: 12, marginBottom: 8 },
  img: { width: 44, height: 44, borderRadius: 8 },
  name: { fontWeight: '700', color: colors.text, fontSize: 13 },
  meta: { color: colors.muted, fontSize: 11.5, marginTop: 2 },
  qty: { width: 64, height: 40, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, textAlign: 'center', fontSize: 15, fontWeight: '700', color: colors.text },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border },
});
