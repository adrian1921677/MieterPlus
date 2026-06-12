import '../global.css';
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '@/lib/auth-context';

function ProtectedRoutes() {
  const { session, profile, tenancy, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const segment = segments[0];
    const inAuth = segment === '(auth)';
    const inOnboarding = segment === '(onboarding)';
    const inApp = segment === '(app)';

    if (!session && !inAuth) {
      router.replace('/(auth)/login');
      return;
    }
    if (session && profile?.role === 'tenant' && !tenancy && !inOnboarding) {
      router.replace('/(onboarding)/code');
      return;
    }
    if (session && profile?.role === 'tenant' && tenancy && !inApp) {
      router.replace('/(app)/requests');
      return;
    }
    if (session && profile?.role === 'landlord' && !inApp) {
      router.replace('/(app)/landlord-info');
      return;
    }
    if (session && inAuth) {
      router.replace('/(app)/requests');
    }
  }, [session, profile, tenancy, loading, segments, router]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563a8" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ProtectedRoutes />
          <StatusBar style="auto" />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
