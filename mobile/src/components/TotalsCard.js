import { Text, View } from 'react-native';
import { colors, inr } from '../theme';
import { Card, Row } from './ui';

export default function TotalsCard({ totals, isDealer }) {
  return (
    <Card>
      <Row label="Subtotal" value={inr(totals.subtotal)} />
      {totals.discount ? (
        <Row label={`Bulk discount (${Math.round(totals.discountRate * 100)}%)`} value={'-' + inr(totals.discount)} color={colors.success} />
      ) : null}
      <Row label="Delivery" value={totals.shipping ? inr(totals.shipping) : 'FREE'} color={totals.shipping ? undefined : colors.success} />
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
      <Row label="Total" value={inr(totals.total)} bold color={isDealer ? colors.dealer : undefined} />
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>Includes GST of {inr(totals.gst)}</Text>
    </Card>
  );
}
