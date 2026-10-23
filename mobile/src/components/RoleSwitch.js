import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

const ROLES = [
  { key: 'customer', label: 'Customer', icon: 'person-outline', color: colors.primary },
  { key: 'dealer', label: 'Dealer', icon: 'storefront-outline', color: colors.dealer },
];

export const roleColor = (role) => (role === 'dealer' ? colors.dealer : colors.primary);

export default function RoleSwitch({ value, onChange }) {
  return (
    <View style={styles.wrap}>
      {ROLES.map((r) => {
        const on = value === r.key;
        return (
          <Pressable key={r.key} onPress={() => onChange(r.key)} style={[styles.opt, on && { backgroundColor: r.color }]}>
            <Ionicons name={r.icon} size={16} color={on ? '#fff' : colors.muted} />
            <Text style={[styles.text, on && { color: '#fff' }]}>{r.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: '#E8EEF2', borderRadius: radius.md, padding: 4, marginBottom: 20 },
  opt: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
  text: { fontWeight: '700', color: colors.muted },
});
