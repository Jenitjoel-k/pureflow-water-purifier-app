import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AddressForm from '../../src/components/AddressForm';
import { Badge, Button, Card, Chip, Input, SectionTitle } from '../../src/components/ui';
import { SUPPORT_PHONE } from '../../src/config';
import { add, update } from '../../src/backend';
import { useAuth } from '../../src/context/AuthContext';
import { fmtDate, useMyDocs } from '../../src/hooks/useMyDocs';
import { notifySelf } from '../../src/lib/api';
import { formatAddress, isAddressComplete } from '../../src/lib/geo';
import { colors, radius } from '../../src/theme';

const TYPES = [
  { key: 'Installation', icon: 'hammer-outline' },
  { key: 'Repair', icon: 'build-outline' },
  { key: 'Filter change', icon: 'funnel-outline' },
  { key: 'AMC / Annual service', icon: 'calendar-outline' },
  { key: 'Water quality test', icon: 'flask-outline' },
  { key: 'Demo', icon: 'play-circle-outline' },
];
const SLOTS = ['9 AM - 12 PM', '12 PM - 3 PM', '3 PM - 6 PM'];

const nextDays = () => Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i + 1);
  return d;
});

export default function Service() {
  const params = useLocalSearchParams();
  const { user, profile, isDealer } = useAuth();
  const { docs: tickets } = useMyDocs('serviceRequests');
  const days = useMemo(nextDays, []);
  const tint = isDealer ? colors.dealer : colors.primary;

  const [type, setType] = useState('Installation');
  const [product, setProduct] = useState('');
  const [issue, setIssue] = useState('');
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState(SLOTS[0]);
  const [address, setAddress] = useState(profile?.address || {});
  const [phone, setPhone] = useState(profile?.phone || '');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(true);

  // The profile may load after this screen mounts (e.g. cold start).
  useEffect(() => {
    if (!profile) return;
    setAddress((a) => (a?.line1 ? a : profile.address || {}));
    setPhone((p) => p || profile.phone || '');
  }, [profile]);

  useEffect(() => {
    if (params.type) setType(params.type);
    if (params.product) setProduct(params.product);
    if (params.type || params.product) setShowForm(true);
  }, [params.type, params.product]);

  const submit = async () => {
    if (!product.trim()) return Alert.alert('Product', 'Tell us which product needs service.');
    if (!isAddressComplete(address)) return Alert.alert('Address', 'Please add street, city and pincode.');
    if (!/^\d{10}$/.test(phone)) return Alert.alert('Phone', 'Enter a 10-digit mobile number.');
    setBusy(true);
    try {
      const ticketNo = 'SR' + Date.now().toString().slice(-7);
      const date = days[day].toISOString().slice(0, 10);
      const ticketId = await add('serviceRequests', {
        ticketNo,
        userId: user.uid,
        name: profile?.name || '',
        email: profile?.email || user.email,
        phone,
        role: profile?.role,
        type,
        product: product.trim(),
        issue: issue.trim(),
        preferredDate: date,
        slot,
        address,
        status: 'open',
        history: [{ status: 'open', at: new Date().toISOString() }],
        createdAt: 'now',
      });
      notifySelf(user.uid, {
        title: 'Service request received',
        body: `Ticket ${ticketNo}: ${type} on ${days[day].toDateString()} (${slot}). We'll confirm a technician soon.`,
        data: { ticketId },
      });
      setIssue('');
      setShowForm(false);
      Alert.alert('Booked!', `Your ticket number is ${ticketNo}.`);
    } catch (e) {
      Alert.alert('Could not book', e.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = (t) => Alert.alert('Cancel this request?', '', [
    { text: 'No' },
    {
      text: 'Yes, cancel',
      style: 'destructive',
      onPress: () => update('serviceRequests', t.id, {
        status: 'cancelled',
        history: [...(t.history || []), { status: 'cancelled', at: new Date().toISOString() }],
        updatedAt: 'now',
      }).catch((e) => Alert.alert('Error', e.message)),
    },
  ]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={[styles.hero, { backgroundColor: tint }]}>
        <Ionicons name="construct" size={30} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Doorstep service</Text>
          <Text style={styles.heroSub}>Certified technicians · Helpline {SUPPORT_PHONE}</Text>
        </View>
      </View>

      {showForm ? (
        <>
          <SectionTitle>What do you need?</SectionTitle>
          <View style={styles.grid}>
            {TYPES.map((t) => {
              const on = type === t.key;
              return (
                <Pressable key={t.key} onPress={() => setType(t.key)} style={[styles.type, on && { borderColor: tint, backgroundColor: '#fff' }]}>
                  <Ionicons name={t.icon} size={22} color={on ? tint : colors.muted} />
                  <Text style={[styles.typeText, on && { color: tint }]}>{t.key}</Text>
                </Pressable>
              );
            })}
          </View>

          <Card style={{ marginTop: 6 }}>
            <Input label="Product" value={product} onChangeText={setProduct} placeholder="e.g. PureFlow Elite RO+UV+UF 10L" />
            <Input label="Describe the issue (optional)" value={issue} onChangeText={setIssue} multiline placeholder="Leaking from the tap, water tastes salty…" />

            <Text style={styles.label}>Preferred date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {days.map((d, i) => (
                <Pressable key={i} onPress={() => setDay(i)} style={[styles.day, day === i && { backgroundColor: tint, borderColor: tint }]}>
                  <Text style={[styles.dayW, day === i && { color: '#fff' }]}>{d.toLocaleDateString('en-IN', { weekday: 'short' })}</Text>
                  <Text style={[styles.dayN, day === i && { color: '#fff' }]}>{d.getDate()}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>Time slot</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {SLOTS.map((s) => <Chip key={s} label={s} active={slot === s} onPress={() => setSlot(s)} color={tint} />)}
            </View>
          </Card>

          <SectionTitle style={{ marginTop: 20 }}>Service address</SectionTitle>
          <Card>
            <AddressForm value={address} onChange={setAddress} />
            <Input label="Contact number" value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, ''))} keyboardType="phone-pad" maxLength={10} style={{ marginBottom: 0 }} />
          </Card>
          <Button title="Book service visit" icon="calendar" onPress={submit} loading={busy} color={tint} style={{ marginTop: 16 }} />
        </>
      ) : (
        <Button title="Book another service" icon="add" variant="outline" color={tint} onPress={() => setShowForm(true)} />
      )}

      <SectionTitle style={{ marginTop: 28 }}>My service requests</SectionTitle>
      {!tickets.length ? <Text style={{ color: colors.muted }}>No requests yet.</Text> : null}
      {tickets.map((t) => (
        <Card key={t.id} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: colors.text }}>{t.type} · #{t.ticketNo}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Booked {fmtDate(t.createdAt)}</Text>
            </View>
            <Badge status={t.status} />
          </View>
          <Text style={styles.tLine}><Text style={styles.tKey}>Product: </Text>{t.product}</Text>
          <Text style={styles.tLine}><Text style={styles.tKey}>Visit: </Text>{new Date(t.preferredDate).toDateString()} · {t.slot}</Text>
          <Text style={styles.tLine} numberOfLines={2}><Text style={styles.tKey}>At: </Text>{formatAddress(t.address)}</Text>
          {t.technician?.name ? (
            <View style={styles.tech}>
              <Ionicons name="person-circle" size={22} color={tint} />
              <Text style={{ color: colors.text, flex: 1 }}>{t.technician.name}{t.technician.phone ? ` · ${t.technician.phone}` : ''}</Text>
            </View>
          ) : null}
          {t.adminNote ? <Text style={[styles.tLine, { fontStyle: 'italic' }]}>"{t.adminNote}"</Text> : null}
          {t.status === 'open' ? <Button title="Cancel request" variant="danger" onPress={() => cancel(t)} style={{ marginTop: 10, height: 40 }} /> : null}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center', borderRadius: radius.lg, padding: 16, marginBottom: 18 },
  heroTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.85)', marginTop: 2, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  type: {
    width: '31.5%', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#FAFCFD', marginBottom: 10, gap: 6,
  },
  typeText: { fontSize: 11.5, fontWeight: '700', color: colors.text, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 },
  day: { width: 56, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginRight: 8, backgroundColor: '#fff' },
  dayW: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  dayN: { fontSize: 18, fontWeight: '800', color: colors.text },
  tLine: { color: colors.text, marginTop: 6 },
  tKey: { color: colors.muted },
  tech: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.bg, padding: 10, borderRadius: 10, marginTop: 10 },
});
