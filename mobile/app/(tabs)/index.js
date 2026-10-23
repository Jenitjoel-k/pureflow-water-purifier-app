import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProductCard from '../../src/components/ProductCard';
import { Chip, Empty, Loading } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { CATEGORIES, useProducts } from '../../src/context/ProductsContext';
import { useMyDocs } from '../../src/hooks/useMyDocs';
import { colors, radius } from '../../src/theme';

const SORTS = [
  { key: 'popular', label: 'Popular' },
  { key: 'low', label: 'Price: low' },
  { key: 'high', label: 'Price: high' },
];

export default function Shop() {
  const { profile, isDealer } = useAuth();
  const { products, loading, error } = useProducts();
  const { docs: notes } = useMyDocs('notifications');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [sort, setSort] = useState('popular');
  const { width } = useWindowDimensions();
  const cardW = (width - 16 * 2 - 12) / 2;
  const unread = notes.filter((n) => !n.read).length;
  const tint = isDealer ? colors.dealer : colors.primary;

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const price = (p) => (isDealer ? p.dealerPrice : p.price);
    const out = products.filter(
      (p) => (cat === 'All' || p.category === cat)
        && (!term || p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)),
    );
    if (sort === 'low') out.sort((a, b) => price(a) - price(b));
    else if (sort === 'high') out.sort((a, b) => price(b) - price(a));
    else out.sort((a, b) => b.rating - a.rating);
    return out;
  }, [products, q, cat, sort, isDealer]);

  const header = (
    <View>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Hi, {profile?.name?.split(' ')[0] || 'there'} 👋</Text>
          <Text style={styles.sub}>{isDealer ? profile?.businessName : 'What does your water need today?'}</Text>
        </View>
        <Pressable onPress={() => router.push('/notifications')} style={styles.bell}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {unread ? <View style={[styles.dot, { backgroundColor: tint }]}><Text style={styles.dotText}>{unread}</Text></View> : null}
        </Pressable>
      </View>

      {isDealer ? (
        <Pressable style={styles.dealerBanner} onPress={() => router.push('/bulk-order')}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Dealer pricing active</Text>
            <Text style={styles.bannerSub}>Wholesale rates · extra 3% off above ₹50k, 5% above ₹1L</Text>
          </View>
          <View style={styles.bannerBtn}>
            <Ionicons name="layers-outline" size={16} color={colors.dealer} />
            <Text style={{ color: colors.dealer, fontWeight: '800', fontSize: 12 }}>Bulk order</Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Free installation</Text>
            <Text style={styles.heroSub}>On every purifier. Free delivery above ₹999.</Text>
          </View>
          <Ionicons name="water" size={56} color="rgba(255,255,255,0.35)" />
        </View>
      )}

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search purifiers, filters, pumps…"
          placeholderTextColor="#94A3B8"
          style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: 10 }}
        />
        {q ? <Ionicons name="close-circle" size={18} color={colors.muted} onPress={() => setQ('')} /> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        {['All', ...CATEGORIES].map((c) => (
          <Chip key={c} label={c} active={cat === c} onPress={() => setCat(c)} color={tint} />
        ))}
      </ScrollView>
      <View style={styles.sortRow}>
        <Text style={styles.count}>{list.length} products</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {SORTS.map((s) => (
            <Text key={s.key} onPress={() => setSort(s.key)} style={[styles.sort, sort === s.key && { color: tint, fontWeight: '800' }]}>
              {s.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListHeaderComponent={header}
        renderItem={({ item }) => <ProductCard product={item} width={cardW} />}
        ListEmptyComponent={
          loading ? <Loading /> : (
            <Empty
              icon={error ? 'cloud-offline-outline' : 'search-outline'}
              title={error ? 'Could not load products' : 'No products found'}
              subtitle={error || 'Try a different search or category.'}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  hello: { fontSize: 22, fontWeight: '900', color: colors.text },
  sub: { color: colors.muted, marginTop: 2 },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 4, right: 4, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  dotText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  hero: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  dealerBanner: { backgroundColor: colors.dealer, borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  bannerSub: { color: 'rgba(255,255,255,0.9)', marginTop: 3, fontSize: 12 },
  bannerBtn: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', gap: 4, alignItems: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  sortRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  count: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  sort: { color: colors.muted, fontSize: 12, fontWeight: '600' },
});
