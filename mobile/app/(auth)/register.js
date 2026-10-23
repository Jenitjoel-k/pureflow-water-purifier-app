import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RoleSwitch, { roleColor } from '../../src/components/RoleSwitch';
import { Button, Input } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme';

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export default function Register() {
  const params = useLocalSearchParams();
  const { signUp } = useAuth();
  const [role, setRole] = useState(params.role === 'dealer' ? 'dealer' : 'customer');
  const [f, setF] = useState({ name: '', phone: '', email: '', password: '', businessName: '', gstin: '', city: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const tint = roleColor(role);

  const validate = () => {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Enter your full name';
    if (!/^[6-9]\d{9}$/.test(f.phone.replace(/\D/g, '').slice(-10))) e.phone = 'Enter a valid 10-digit mobile number';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email';
    if (f.password.length < 6) e.password = 'At least 6 characters';
    if (role === 'dealer') {
      if (f.businessName.trim().length < 2) e.businessName = 'Enter your business name';
      if (f.gstin && !GSTIN_RE.test(f.gstin.trim().toUpperCase())) e.gstin = 'GSTIN format looks wrong';
      if (!f.city.trim()) e.city = 'Enter your city';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    setError('');
    if (!validate()) return;
    setBusy(true);
    try {
      await signUp({ ...f, role, phone: f.phone.replace(/\D/g, '').slice(-10) });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.sub}>
            {role === 'dealer'
              ? 'Dealer accounts are reviewed by our team. Once approved you will see wholesale prices.'
              : 'Shop purifiers, filters and spares and book service visits.'}
          </Text>
          <RoleSwitch value={role} onChange={setRole} />

          <Input label="Full name" value={f.name} onChangeText={set('name')} error={errors.name} />
          <Input label="Mobile number" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={13} error={errors.phone} />
          <Input label="Email" value={f.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" error={errors.email} />
          <Input label="Password" value={f.password} onChangeText={set('password')} secureTextEntry error={errors.password} />

          {role === 'dealer' ? (
            <View style={styles.dealerBox}>
              <Text style={[styles.boxTitle, { color: colors.dealer }]}>Business details</Text>
              <Input label="Business / shop name" value={f.businessName} onChangeText={set('businessName')} error={errors.businessName} />
              <Input label="GSTIN (optional)" value={f.gstin} onChangeText={set('gstin')} autoCapitalize="characters" maxLength={15} error={errors.gstin} placeholder="22AAAAA0000A1Z5" />
              <Input label="City" value={f.city} onChangeText={set('city')} error={errors.city} />
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title={role === 'dealer' ? 'Submit dealer application' : 'Create account'} onPress={submit} loading={busy} color={tint} />
          <Button title="I already have an account" variant="ghost" color={tint} onPress={() => router.back()} style={{ marginTop: 6 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, paddingTop: 32 },
  title: { fontSize: 26, fontWeight: '900', color: colors.text },
  sub: { color: colors.muted, marginTop: 6, marginBottom: 20, lineHeight: 20 },
  dealerBox: { backgroundColor: colors.dealerSoft, padding: 14, borderRadius: 14, marginBottom: 14 },
  boxTitle: { fontWeight: '800', marginBottom: 10 },
  error: { color: colors.danger, marginBottom: 12 },
});
