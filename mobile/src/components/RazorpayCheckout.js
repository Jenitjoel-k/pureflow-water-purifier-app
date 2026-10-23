import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { RAZORPAY_KEY_ID, STORE_NAME } from '../config';
import { colors, inr } from '../theme';
import { Button } from './ui';

// Razorpay Standard Checkout (checkout.js) inside a WebView, so it runs in
// Expo Go and in an APK without a native module. Test mode (rzp_test_ keys)
// needs no KYC; use card 4111 1111 1111 1111, any future expiry, any CVV.
const html = (opts) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;color:#64748B}</style>
</head><body><p>Opening secure payment…</p>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  function post(m){ window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  try {
    var o = ${JSON.stringify(opts)};
    o.handler = function (r) { post({ type: 'success', paymentId: r.razorpay_payment_id }); };
    o.modal = { ondismiss: function () { post({ type: 'dismiss' }); }, confirm_close: true };
    var rzp = new Razorpay(o);
    rzp.on('payment.failed', function (e) { post({ type: 'failed', error: e.error && e.error.description }); });
    rzp.open();
  } catch (e) { post({ type: 'failed', error: String(e) }); }
</script></body></html>`;

// Used when no Razorpay key is configured (offline demo build): a clearly
// labelled simulated test payment, so the online-payment flow can be shown.
function DemoPayment({ amount, color, onSuccess, onFailure }) {
  const [busy, setBusy] = useState(false);
  const pay = (ok) => {
    setBusy(true);
    setTimeout(() => (ok ? onSuccess(`pay_demo${Date.now().toString(36)}`) : onFailure('Payment declined by bank (simulated)')), 1500);
  };
  return (
    <View style={{ padding: 20, gap: 14 }}>
      <View style={[styles.demoTag]}>
        <Ionicons name="flask-outline" size={16} color={colors.warning} />
        <Text style={{ color: colors.warning, fontWeight: '700', flex: 1 }}>Test payment · demo mode · no money is charged</Text>
      </View>
      <Text style={{ color: colors.muted }}>Amount payable</Text>
      <Text style={{ fontSize: 30, fontWeight: '900', color: colors.text, marginTop: -8 }}>{inr(amount)}</Text>
      <View style={styles.cardBox}>
        <Text style={styles.cardLabel}>Card number</Text>
        <Text style={styles.cardValue}>4111 1111 1111 1111</Text>
        <View style={{ flexDirection: 'row', gap: 24, marginTop: 10 }}>
          <View><Text style={styles.cardLabel}>Expiry</Text><Text style={styles.cardValue}>12/30</Text></View>
          <View><Text style={styles.cardLabel}>CVV</Text><Text style={styles.cardValue}>•••</Text></View>
        </View>
      </View>
      <Button title={busy ? 'Processing…' : `Pay ${inr(amount)}`} icon="lock-closed" color={color} loading={busy} onPress={() => pay(true)} />
      <Button title="Simulate a failed payment" variant="ghost" color={colors.danger} disabled={busy} onPress={() => pay(false)} />
    </View>
  );
}

export default function RazorpayCheckout({ visible, amount, description, prefill, color, onSuccess, onFailure, onDismiss }) {
  const options = {
    key: RAZORPAY_KEY_ID,
    amount: Math.round(amount * 100), // paise
    currency: 'INR',
    name: STORE_NAME,
    description,
    prefill,
    theme: { color: color || colors.primary },
  };

  const onMessage = (e) => {
    let m;
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (m.type === 'success') onSuccess(m.paymentId);
    else if (m.type === 'failed') onFailure(m.error || 'Payment failed');
    else onDismiss();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.bar}>
          <Pressable onPress={onDismiss} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Secure payment · Razorpay (Test)</Text>
        </View>
        {RAZORPAY_KEY_ID ? (
          <WebView
            originWhitelist={['*']}
            source={{ html: html(options), baseUrl: 'https://checkout.razorpay.com' }}
            onMessage={onMessage}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            startInLoadingState
            renderLoading={() => <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />}
          />
        ) : (
          <DemoPayment amount={amount} color={color || colors.primary} onSuccess={onSuccess} onFailure={onFailure} />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  demoTag: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.warningSoft, padding: 12, borderRadius: 12 },
  cardBox: { backgroundColor: '#0F172A', borderRadius: 16, padding: 18 },
  cardLabel: { color: '#94A3B8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  cardValue: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 4, letterSpacing: 1 },
});
