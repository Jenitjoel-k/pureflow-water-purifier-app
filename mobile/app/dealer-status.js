import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Row } from '../src/components/ui';
import { SUPPORT_PHONE } from '../src/config';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme';

export default function DealerStatus() {
  const { profile, signOut } = useAuth();
  const rejected = profile?.dealerStatus === 'rejected';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.wrap}>
        <View style={[styles.icon, { backgroundColor: rejected ? colors.dangerSoft : colors.dealerSoft }]}>
          <Ionicons name={rejected ? 'close-circle' : 'hourglass'} size={44} color={rejected ? colors.danger : colors.dealer} />
        </View>
        <Text style={styles.title}>{rejected ? 'Application not approved' : 'Application under review'}</Text>
        <Text style={styles.sub}>
          {rejected
            ? profile?.rejectionReason || 'Unfortunately we could not approve your dealer account at this time.'
            : 'Our team is verifying your business details. This screen updates automatically and you will get a notification once approved.'}
        </Text>
        <Card style={{ width: '100%', marginTop: 24 }}>
          <Row label="Business" value={profile?.businessName || '-'} />
          <Row label="GSTIN" value={profile?.gstin || 'Not provided'} />
          <Row label="Email" value={profile?.email || '-'} />
          <Row label="Support" value={SUPPORT_PHONE} />
        </Card>
        <Button title="Sign out" variant="outline" color={colors.dealer} onPress={signOut} style={{ marginTop: 24, width: '100%' }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '900', color: colors.text, textAlign: 'center' },
  sub: { color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 21 },
});
