import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Anmelden' }} />
      <Stack.Screen name="signup" options={{ title: 'Konto erstellen' }} />
    </Stack>
  );
}
