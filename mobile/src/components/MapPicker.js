import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { reverseGeocode } from '../lib/geo';
import { colors } from '../theme';
import { Button } from './ui';

// Leaflet + OpenStreetMap tiles in a WebView: free, no API key or card.
const html = (lat, lng) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#m{height:100%;margin:0}</style></head><body><div id="m"></div><script>
  var map = L.map('m', { zoomControl: true }).setView([${lat}, ${lng}], 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  var mk = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);
  function send(ll){ window.ReactNativeWebView.postMessage(JSON.stringify({ lat: ll.lat, lng: ll.lng })); }
  map.on('click', function (e) { mk.setLatLng(e.latlng); send(e.latlng); });
  mk.on('dragend', function () { send(mk.getLatLng()); });
</script></body></html>`;

export default function MapPicker({ visible, initial, onClose, onPick }) {
  const start = initial?.lat ? initial : { lat: 28.6139, lng: 77.209 }; // New Delhi
  const [point, setPoint] = useState(start);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      onPick(await reverseGeocode(point.lat, point.lng));
    } catch (e) {
      Alert.alert('Location', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.bar}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Tap the map to set your location</Text>
        </View>
        <WebView
          originWhitelist={['*']}
          source={{ html: html(start.lat, start.lng), baseUrl: 'https://pureflow.local' }}
          onMessage={(e) => setPoint(JSON.parse(e.nativeEvent.data))}
          style={{ flex: 1 }}
        />
        <View style={{ padding: 16 }}>
          <Text style={styles.coords}>
            {point.lat.toFixed(5)}, {point.lng.toFixed(5)} · Map data © OpenStreetMap
          </Text>
          <Button title="Use this location" icon="location" onPress={confirm} loading={busy} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  coords: { fontSize: 12, color: colors.muted, marginBottom: 10, textAlign: 'center' },
});
