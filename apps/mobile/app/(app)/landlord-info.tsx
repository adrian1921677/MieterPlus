import { Text, View, Pressable, Linking } from 'react-native';
import { useAuth } from '@/lib/auth-context';

export default function LandlordInfoScreen() {
  const { profile } = useAuth();
  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      <Text className="mb-2 text-center text-2xl font-bold">
        Hallo {profile?.full_name ?? ''}!
      </Text>
      <Text className="mb-6 text-center text-gray-600">
        Diese App ist für deine Mieter gedacht. Verwalte deine Immobilien und Mängel-Anfragen
        bequem im Web-Dashboard am Computer.
      </Text>
      <Pressable
        className="rounded-lg bg-primary px-6 py-3 active:bg-primary-dark"
        onPress={() =>
          Linking.openURL(process.env.EXPO_PUBLIC_WEB_URL ?? 'https://mieterplus.example')
        }
      >
        <Text className="text-base font-semibold text-white">Web-Dashboard öffnen</Text>
      </Pressable>
    </View>
  );
}
