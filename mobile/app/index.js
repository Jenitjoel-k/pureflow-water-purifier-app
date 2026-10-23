import { ActivityIndicator, View } from 'react-native';
import { colors } from '../src/theme';

// The <Gate /> in _layout redirects from here once auth state is known.
export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
