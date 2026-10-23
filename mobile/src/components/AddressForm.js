import { useState } from 'react';
import { Alert, View } from 'react-native';
import { currentAddress } from '../lib/geo';
import MapPicker from './MapPicker';
import { Button, Input } from './ui';

export default function AddressForm({ value, onChange }) {
  const a = value || {};
  const [locating, setLocating] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const set = (k) => (t) => onChange({ ...a, [k]: t });

  const locate = async () => {
    setLocating(true);
    try {
      onChange({ ...a, ...(await currentAddress()) });
    } catch (e) {
      Alert.alert('Location', e.message);
    } finally {
      setLocating(false);
    }
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <Button title="Current location" icon="navigate" variant="outline" onPress={locate} loading={locating} style={{ flex: 1, height: 44 }} />
        <Button title="Pick on map" icon="map" variant="outline" onPress={() => setMapOpen(true)} style={{ flex: 1, height: 44 }} />
      </View>
      <Input label="House / street / area" value={a.line1} onChangeText={set('line1')} placeholder="12, MG Road, Indiranagar" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Input label="City" value={a.city} onChangeText={set('city')} style={{ flex: 1 }} />
        <Input label="Pincode" value={a.pincode} onChangeText={set('pincode')} keyboardType="number-pad" maxLength={6} style={{ flex: 1 }} />
      </View>
      <Input label="State" value={a.state} onChangeText={set('state')} />
      {mapOpen ? (
        <MapPicker
          visible
          initial={a}
          onClose={() => setMapOpen(false)}
          onPick={(picked) => {
            onChange({ ...a, ...picked });
            setMapOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}
