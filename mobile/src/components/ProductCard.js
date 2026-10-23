import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { imageSource } from '../lib/image';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { colors, radius, shadow } from '../theme';
import { PriceTag } from './ui';

export default function ProductCard({ product, width }) {
  const { isDealer } = useAuth();
  const { add, qtyOf } = useCart();
  const inCart = qtyOf(product.id);
  const outOfStock = !product.stock;

  return (
    <Pressable style={[styles.card, { width }]} onPress={() => router.push(`/product/${product.id}`)}>
      <View style={styles.imgWrap}>
        <Image source={imageSource(product.image)} style={styles.img} contentFit="contain" transition={200} />
        {isDealer ? (
          <View style={[styles.tag, { backgroundColor: colors.dealer }]}>
            <Text style={styles.tagText}>MOQ {product.moq}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ padding: 10, flex: 1 }}>
        <Text style={styles.cat}>{product.category}</Text>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <View style={styles.rating}>
          <Ionicons name="star" size={12} color="#F59E0B" />
          <Text style={styles.ratingText}>{product.rating?.toFixed(1)}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <PriceTag product={product} isDealer={isDealer} />
        <Pressable
          disabled={outOfStock}
          onPress={() => add(product)}
          style={[styles.add, inCart && styles.added, outOfStock && { opacity: 0.4 }]}
        >
          <Ionicons name={inCart ? 'checkmark' : 'cart-outline'} size={15} color={inCart ? colors.primary : '#fff'} />
          <Text style={[styles.addText, inCart && { color: colors.primary }]}>
            {outOfStock ? 'Out of stock' : inCart ? `In cart (${inCart})` : 'Add'}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.lg, overflow: 'hidden', marginBottom: 14, ...shadow },
  imgWrap: { backgroundColor: '#fff', aspectRatio: 1, borderBottomWidth: 1, borderBottomColor: colors.border },
  img: { width: '100%', height: '100%' },
  tag: { position: 'absolute', top: 8, left: 8, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  cat: { fontSize: 10, color: colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 2, minHeight: 34 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginVertical: 4 },
  ratingText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  add: {
    marginTop: 8, height: 34, borderRadius: 10, backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  added: { backgroundColor: colors.primarySoft },
  addText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
