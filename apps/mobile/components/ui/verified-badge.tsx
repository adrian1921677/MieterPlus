import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Instagram-Style verifiziert-Haken (1:1 wie Web).
 */
export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="checkmark" size={size * 0.7} color="#ffffff" />
    </View>
  );
}
