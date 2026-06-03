import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen name="address" options={{ title: 'Deine Adresse' }} />
      <Stack.Screen name="code" options={{ title: 'Einladungscode' }} />
    </Stack>
  );
}
