import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import AddressForm from '../src/components/AddressForm';
import { Button, Card, Input, SectionTitle } from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme';

export default function EditProfile() {
  const { profile, isDealer, updateProfile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [businessName, setBusinessName] = useState(profile?.businessName || '');
  const [address, setAddress] = useState(profile?.address || {});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName((v) => v || profile.name || '');
    setPhone((v) => v || profile.phone || '');
    setBusinessName((v) => v || profile.businessName || '');
    setAddress((a) => (a?.line1 ? a : profile.address || {}));
  }, [profile]);

  const save = async () => {
    if (name.trim().length < 2) return Alert.alert('Name', 'Enter your full name.');
    if (phone && !/^\d{10}$/.test(phone)) return Alert.alert('Phone', 'Enter a 10-digit mobile number.');
    setBusy(true);
    try {
      await updateProfile({ name: name.trim(), phone, address, ...(isDealer ? { businessName: businessName.trim() } : {}) });
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Card>
        <Input label="Full name" value={name} onChangeText={setName} />
        <Input label="Mobile number" value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, ''))} keyboardType="phone-pad" maxLength={10} />
        <Input label="Email" value={profile?.email} editable={false} style={{ marginBottom: isDealer ? 14 : 0, opacity: 0.6 }} />
        {isDealer ? <Input label="Business name" value={businessName} onChangeText={setBusinessName} style={{ marginBottom: 0 }} /> : null}
      </Card>
      <SectionTitle style={{ marginTop: 20 }}>Default address</SectionTitle>
      <Card>
        <AddressForm value={address} onChange={setAddress} />
      </Card>
      <Button title="Save changes" onPress={save} loading={busy} color={isDealer ? colors.dealer : colors.primary} style={{ marginTop: 20 }} />
    </ScrollView>
  );
}
