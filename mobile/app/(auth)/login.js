import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RoleSwitch, { roleColor } from '../../src/components/RoleSwitch';
import { Button, Input } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme';

const DEMO_ACCOUNTS = [
  { role: 'customer', label: 'Customer', email: 'customer@pureflow.test', password: 'Customer@123' },
  { role: 'dealer', label: 'Approved dealer', email: 'dealer@pureflow.test', password: 'Dealer@123' },
  { role: 'dealer', label: 'Pending dealer', email: 'newdealer@pureflow.test', password: 'Dealer@123' },
];

export default function Login() {
  const { signIn, resetPassword, isDemo } = useAuth();
  const [role, setRole] = useState('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tint = roleColor(role);

  const submit = async () => {
    setError('');
    if (!email || !password) return setError('Enter your email and password.');
    setBusy(true);
    try {
      await signIn(email, password, role);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email) return setError('Enter your email above, then tap "Forgot password".');
    try {
      await resetPassword(email);
      Alert.alert('Check your inbox', 'We sent a password reset link to ' + email);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <View style={[styles.logo, { backgroundColor: tint }]}>
            <Ionicons name="water" size={40} color="#fff" />
          </View>
          <Text style={styles.brand}>PureFlow</Text>
          <Text style={styles.tag}>
            {role === 'dealer' ? 'Dealer portal · wholesale prices & bulk orders' : 'Clean water, delivered to your door'}
          </Text>

          <RoleSwitch value={role} onChange={(r) => { setRole(r); setError(''); }} />

          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button title={role === 'dealer' ? 'Sign in as Dealer' : 'Sign in'} onPress={submit} loading={busy} color={tint} />
          <Button title="Forgot password?" variant="ghost" onPress={forgot} color={tint} style={{ marginTop: 4 }} />

          {isDemo ? (
            <View style={styles.demo}>
              <Text style={styles.demoTitle}>Demo accounts · tap to fill</Text>
              {DEMO_ACCOUNTS.filter((a) => a.role === role).map((a) => (
                <Text
                  key={a.email}
                  style={[styles.demoRow, { color: tint }]}
                  onPress={() => { setEmail(a.email); setPassword(a.password); setError(''); }}
                >
                  {a.label}: {a.email}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.footer}>
            <Text style={{ color: colors.muted }}>New here? </Text>
            <Link href={{ pathname: '/(auth)/register', params: { role } }} style={{ color: tint, fontWeight: '700' }}>
              {role === 'dealer' ? 'Apply for a dealer account' : 'Create an account'}
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, paddingTop: 48, flexGrow: 1 },
  logo: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  brand: { fontSize: 30, fontWeight: '900', color: colors.text, textAlign: 'center', marginTop: 14 },
  tag: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 4, marginBottom: 28 },
  error: { color: colors.danger, marginBottom: 12, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  demo: { marginTop: 18, padding: 14, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, gap: 8 },
  demoTitle: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  demoRow: { fontWeight: '600', paddingVertical: 2 },
});
