import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AddressForm from '../src/components/AddressForm';
import RazorpayCheckout from '../src/components/RazorpayCheckout';
import TotalsCard from '../src/components/TotalsCard';
import { Button, Card, Input, SectionTitle } from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { add } from '../src/backend';
import { useCart } from '../src/context/CartContext';
import { notifySelf } from '../src/lib/api';
import { isAddressComplete } from '../src/lib/geo';
import { unitPrice } from '../src/lib/pricing';
import { colors, inr, radius } from '../src/theme';

const METHODS = [
  { key: 'razorpay', title: 'Pay online', sub: 'UPI, cards, netbanking · Razorpay', icon: 'card-outline' },
  { key: 'cod', title: 'Cash on delivery', sub: 'Pay when your order arrives', icon: 'cash-outline' },
];
const DEALER_METHODS = [
  METHODS[0],
  { key: 'credit', title: 'Dealer credit (15 days)', sub: 'Invoice payable within 15 days', icon: 'document-text-outline' },
];

export default function Checkout() {
  const { user, profile, isDealer, updateProfile } = useAuth();
  const { lines, totals, clear } = useCart();
  const [address, setAddress] = useState(profile?.address || {});
  const [phone, setPhone] = useState(profile?.phone || '');
  const [note, setNote] = useState('');
  const methods = isDealer ? DEALER_METHODS : METHODS;
  const [method, setMethod] = useState('razorpay');
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const tint = isDealer ? colors.dealer : colors.primary;

  // The profile may load after this screen mounts.
  useEffect(() => {
    if (!profile) return;
    setAddress((a) => (a?.line1 ? a : profile.address || {}));
    setPhone((p) => p || profile.phone || '');
  }, [profile]);

  const placeOrder = async (payment) => {
    setBusy(true);
    try {
      const orderNo = 'PF' + Date.now().toString().slice(-8);
      const orderId = await add('orders', {
        orderNo,
        userId: user.uid,
        customerName: profile?.name || '',
        customerEmail: profile?.email || user.email,
        customerPhone: phone,
        businessName: isDealer ? profile?.businessName || '' : null,
        channel: isDealer ? 'dealer' : 'retail',
        items: lines.map(({ product: p, qty }) => ({
          productId: p.id,
          name: p.name,
          image: p.image,
          category: p.category,
          price: unitPrice(p, isDealer),
          qty,
        })),
        itemCount: lines.reduce((s, l) => s + l.qty, 0),
        ...totals,
        address,
        note: note.trim(),
        payment,
        status: 'placed',
        statusHistory: [{ status: 'placed', at: new Date().toISOString() }],
        createdAt: 'now',
      });
      // Remember the address for next time (and for service bookings).
      updateProfile({ address, phone }).catch(() => {});
      clear();
      notifySelf(user.uid, {
        title: isDealer ? 'Bulk order received' : 'Order placed successfully',
        body: `Order ${orderNo} for ${inr(totals.total)} has been placed. We'll notify you when it ships.`,
        data: { orderId },
      });
      // Back from the confirmation should land on the shop, not the empty checkout.
      router.dismissAll();
      router.push(`/order/${orderId}?fresh=1`);
    } catch (e) {
      Alert.alert('Could not place order', e.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!isAddressComplete(address)) return Alert.alert('Address needed', 'Please fill in street, city and pincode.');
    if (!/^\d{10}$/.test(phone)) return Alert.alert('Phone needed', 'Enter a 10-digit mobile number for delivery updates.');
    if (method === 'razorpay') setPaying(true);
    else placeOrder({ method, status: method === 'cod' ? 'pending' : 'credit' });
  };

  if (!lines.length && !busy) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.muted }}>Your cart is empty.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <SectionTitle>Delivery address</SectionTitle>
        <Card>
          <AddressForm value={address} onChange={setAddress} />
          <Input label="Mobile for delivery" value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, ''))} keyboardType="phone-pad" maxLength={10} style={{ marginBottom: 0 }} />
        </Card>

        <SectionTitle style={{ marginTop: 20 }}>Payment method</SectionTitle>
        {methods.map((m) => {
          const on = method === m.key;
          return (
            <Pressable key={m.key} onPress={() => setMethod(m.key)} style={[styles.method, on && { borderColor: tint, backgroundColor: '#fff' }]}>
              <Ionicons name={m.icon} size={22} color={on ? tint : colors.muted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.mTitle}>{m.title}</Text>
                <Text style={styles.mSub}>{m.sub}</Text>
              </View>
              <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? tint : colors.muted} />
            </Pressable>
          );
        })}

        <SectionTitle style={{ marginTop: 20 }}>Order summary · {lines.length} item{lines.length > 1 ? 's' : ''}</SectionTitle>
        <Card style={{ marginBottom: 12 }}>
          {lines.map(({ product: p, qty }) => (
            <View key={p.id} style={styles.item}>
              <Text style={{ flex: 1, color: colors.text }} numberOfLines={1}>{qty} × {p.name}</Text>
              <Text style={{ fontWeight: '700', color: colors.text }}>{inr(unitPrice(p, isDealer) * qty)}</Text>
            </View>
          ))}
        </Card>
        <TotalsCard totals={totals} isDealer={isDealer} />
        <Input label="Order note (optional)" value={note} onChangeText={setNote} placeholder="Delivery instructions, PO number…" style={{ marginTop: 16 }} />
      </ScrollView>

      <View style={styles.bar}>
        <Button
          title={method === 'razorpay' ? `Pay ${inr(totals.total)}` : `Place order · ${inr(totals.total)}`}
          icon={method === 'razorpay' ? 'lock-closed' : 'checkmark-circle'}
          loading={busy}
          color={tint}
          onPress={submit}
        />
      </View>

      {paying ? (
        <RazorpayCheckout
          visible
          amount={totals.total}
          description={`${lines.length} item(s)`}
          prefill={{ name: profile?.name, email: profile?.email, contact: phone }}
          color={tint}
          onSuccess={(paymentId) => {
            setPaying(false);
            placeOrder({ method: 'razorpay', status: 'paid', razorpayPaymentId: paymentId, mode: 'test' });
          }}
          onFailure={(err) => {
            setPaying(false);
            Alert.alert('Payment failed', err);
          }}
          onDismiss={() => setPaying(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  method: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#FAFCFD', marginBottom: 10,
  },
  mTitle: { fontWeight: '700', color: colors.text },
  mSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  item: { flexDirection: 'row', gap: 10, paddingVertical: 5 },
  bar: { padding: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border },
});
