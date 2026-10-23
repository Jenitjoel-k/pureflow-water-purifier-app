import * as Location from 'expo-location';

const UA = { 'User-Agent': 'PureFlowStore/1.0 (demo app)', 'Accept-Language': 'en' };

// OpenStreetMap Nominatim reverse geocoding (free, no key; 1 req/sec policy).
export async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error('Could not look up this location');
  const j = await res.json();
  const a = j.address || {};
  const line1 = [a.house_number, a.road || a.pedestrian, a.neighbourhood || a.suburb].filter(Boolean).join(', ');
  return {
    line1: line1 || (j.display_name || '').split(',').slice(0, 2).join(','),
    city: a.city || a.town || a.village || a.county || a.state_district || '',
    state: a.state || '',
    pincode: a.postcode || '',
    lat,
    lng,
  };
}

export async function currentAddress() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Location permission was denied');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return reverseGeocode(pos.coords.latitude, pos.coords.longitude);
}

export const formatAddress = (a) =>
  a ? [a.line1, a.city, a.state, a.pincode].filter(Boolean).join(', ') : '';

export const isAddressComplete = (a) => !!(a?.line1 && a?.city && a?.pincode);
