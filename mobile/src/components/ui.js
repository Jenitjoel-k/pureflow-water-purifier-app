import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, inr, radius, shadow, statusColors } from '../theme';

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style, color }) {
  const bg = color || colors.primary;
  const v = {
    primary: { backgroundColor: bg, borderColor: bg, text: '#fff' },
    outline: { backgroundColor: 'transparent', borderColor: bg, text: bg },
    ghost: { backgroundColor: 'transparent', borderColor: 'transparent', text: bg },
    danger: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft, text: colors.danger },
  }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: v.backgroundColor, borderColor: v.borderColor, opacity: off ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={v.text} style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.btnText, { color: v.text }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Input({ label, error, style, ...props }) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor="#94A3B8"
        {...props}
        style={[styles.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }, error && { borderColor: colors.danger }]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export const Card = ({ children, style }) => <View style={[styles.card, style]}>{children}</View>;

export function Badge({ status, label }) {
  const [fg, bg] = statusColors[status] || [colors.muted, colors.border];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{(label || status || '').replace('_', ' ')}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress, color = colors.primary }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
    >
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Empty({ icon = 'water-outline', title, subtitle, action }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
      {action}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.empty}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function QtyStepper({ value, onChange, min = 1, max = 9999, compact }) {
  const size = compact ? 30 : 36;
  return (
    <View style={styles.stepper}>
      <Pressable style={[styles.stepBtn, { width: size, height: size }]} onPress={() => onChange(value - 1 < min ? 0 : value - 1)}>
        <Ionicons name={value <= min ? 'trash-outline' : 'remove'} size={16} color={colors.primary} />
      </Pressable>
      <Text style={styles.stepVal}>{value}</Text>
      <Pressable
        style={[styles.stepBtn, { width: size, height: size }, value >= max && { opacity: 0.4 }]}
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
      >
        <Ionicons name="add" size={16} color={colors.primary} />
      </Pressable>
    </View>
  );
}

export function PriceTag({ product, isDealer, size = 'md' }) {
  const big = size === 'lg';
  const price = isDealer ? product.dealerPrice : product.price;
  const strike = isDealer ? product.price : product.mrp;
  const off = strike > price ? Math.round(((strike - price) / strike) * 100) : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
      <Text style={{ fontSize: big ? 24 : 15, fontWeight: '800', color: isDealer ? colors.dealer : colors.text }}>{inr(price)}</Text>
      {strike > price ? <Text style={{ fontSize: big ? 14 : 11, color: colors.muted, textDecorationLine: 'line-through' }}>{inr(strike)}</Text> : null}
      {off ? <Text style={{ fontSize: big ? 14 : 11, color: colors.success, fontWeight: '700' }}>{off}% off</Text> : null}
    </View>
  );
}

export function Row({ label, value, bold, color }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold, color && { color }]}>{value}</Text>
    </View>
  );
}

export const SectionTitle = ({ children, style }) => <Text style={[styles.section, style]}>{children}</Text>;

const styles = StyleSheet.create({
  btn: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  btnText: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, ...shadow },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, minHeight: 300 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptySub: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 6, marginBottom: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepVal: { minWidth: 28, textAlign: 'center', fontSize: 15, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { color: colors.muted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '600' },
  bold: { color: colors.text, fontSize: 16, fontWeight: '800' },
  section: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 10 },
});
