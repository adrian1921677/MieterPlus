import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';

export default function ProfileScreen() {
  const { profile, session, signOut } = useAuth();
  return (
    <View className="flex-1 bg-gray-50">
      <View className="m-4 rounded-xl bg-white p-4">
        <Text className="text-xs uppercase text-gray-500">Eingeloggt als</Text>
        <Text className="mt-1 text-lg font-semibold">{profile?.full_name ?? '—'}</Text>
        <Text className="text-sm text-gray-600">{session?.user?.email ?? ''}</Text>
        <Text className="mt-1 text-xs text-gray-500">
          Rolle:{' '}
          {profile?.role === 'tenant'
            ? 'Mieter'
            : profile?.role === 'landlord'
              ? 'Vermieter'
              : 'Administrator'}
        </Text>
      </View>

      <Pressable
        onPress={signOut}
        className="mx-4 flex-row items-center justify-center gap-2 rounded-xl bg-white p-4 active:bg-gray-100"
      >
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text className="font-medium text-red-600">Abmelden</Text>
      </Pressable>

      <View className="mt-auto p-6">
        <Text className="text-center text-xs text-gray-400">
          MieterPlus · Eine App von ADB · v0.1.0
        </Text>
      </View>
    </View>
  );
}
