import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { registerPushToken } from '@/lib/push';

export default function AppLayout() {
  const { session, profile } = useAuth();

  useEffect(() => {
    if (session?.user?.id) void registerPushToken(session.user.id);
  }, [session?.user?.id]);

  if (profile?.role === 'landlord') {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#2563a8',
          headerStyle: { backgroundColor: '#fff' },
        }}
      >
        <Tabs.Screen
          name="landlord-info"
          options={{
            title: 'Info',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="information-circle-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="support"
          options={{
            title: 'Hilfe',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubble-ellipses-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen name="requests" options={{ href: null }} />
        <Tabs.Screen name="new-request" options={{ href: null }} />
        <Tabs.Screen name="request" options={{ href: null }} />
      </Tabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563a8',
        headerStyle: { backgroundColor: '#fff' },
      }}
    >
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Mängel',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="new-request"
        options={{
          title: 'Neu melden',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: 'Hilfe',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="landlord-info" options={{ href: null }} />
      <Tabs.Screen name="request" options={{ href: null }} />
    </Tabs>
  );
}
