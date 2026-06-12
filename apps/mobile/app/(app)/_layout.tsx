import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { registerPushToken } from '@/lib/push';
import { Brand } from '@/components/ui/brand';

function AppHeader() {
  return (
    <View className="border-b border-border bg-white px-4 pb-3 pt-12">
      <Brand variant="inline-md" />
    </View>
  );
}

const tabScreenOptions = {
  tabBarActiveTintColor: '#2563eb',
  tabBarInactiveTintColor: '#64748b',
  tabBarStyle: {
    backgroundColor: '#ffffff',
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabBarLabelStyle: { fontSize: 11, fontWeight: '500' as const },
  header: () => <AppHeader />,
};

export default function AppLayout() {
  const { session, profile } = useAuth();

  useEffect(() => {
    if (session?.user?.id) void registerPushToken(session.user.id);
  }, [session?.user?.id]);

  const isLandlordOrAdmin = profile?.role === 'landlord' || profile?.role === 'admin';

  if (isLandlordOrAdmin) {
    return (
      <Tabs screenOptions={tabScreenOptions}>
        <Tabs.Screen
          name="overview"
          options={{
            title: 'Übersicht',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="properties"
          options={{
            title: 'Immobilien',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="business-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="landlord-requests"
          options={{
            title: 'Mängel',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="construct-outline" color={color} size={size} />
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
        {/* Hidden routes */}
        <Tabs.Screen name="requests" options={{ href: null }} />
        <Tabs.Screen name="new-request" options={{ href: null }} />
        <Tabs.Screen name="request/[id]" options={{ href: null }} />
        <Tabs.Screen name="landlord-info" options={{ href: null }} />
        <Tabs.Screen name="support" options={{ href: null, title: 'Hilfe' }} />
        <Tabs.Screen name="property/[id]" options={{ href: null }} />
        <Tabs.Screen name="new-property" options={{ href: null }} />
        <Tabs.Screen name="verify-identity" options={{ href: null }} />
        <Tabs.Screen name="admin/property-verifications" options={{ href: null }} />
        <Tabs.Screen name="admin/identity-verifications" options={{ href: null }} />
        <Tabs.Screen name="admin/property-review/[id]" options={{ href: null }} />
        <Tabs.Screen name="admin/identity-review/[id]" options={{ href: null }} />
        <Tabs.Screen name="vault/index" options={{ href: null, title: 'Tresor' }} />
        <Tabs.Screen name="vault/new" options={{ href: null, title: 'Neues Dokument' }} />
        <Tabs.Screen name="vault/[id]" options={{ href: null, title: 'Dokument' }} />
        <Tabs.Screen name="appointments/index" options={{ href: null, title: 'Termine' }} />
        <Tabs.Screen name="appointments/new" options={{ href: null, title: 'Neuer Termin' }} />
        <Tabs.Screen name="appointments/[id]" options={{ href: null, title: 'Termin' }} />
        <Tabs.Screen name="managers/index" options={{ href: null, title: 'Hausverwaltung' }} />
        <Tabs.Screen name="managers/new" options={{ href: null, title: 'Verwalter einladen' }} />
        <Tabs.Screen name="managers/[id]" options={{ href: null, title: 'Verwalter' }} />
      </Tabs>
    );
  }

  // Tenant tabs
  return (
    <Tabs screenOptions={tabScreenOptions}>
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
      {/* Hidden */}
      <Tabs.Screen name="overview" options={{ href: null }} />
      <Tabs.Screen name="properties" options={{ href: null }} />
      <Tabs.Screen name="landlord-requests" options={{ href: null }} />
      <Tabs.Screen name="landlord-info" options={{ href: null }} />
      <Tabs.Screen name="request/[id]" options={{ href: null }} />
      <Tabs.Screen name="property/[id]" options={{ href: null }} />
      <Tabs.Screen name="new-property" options={{ href: null }} />
      <Tabs.Screen name="verify-identity" options={{ href: null }} />
      <Tabs.Screen name="admin/property-verifications" options={{ href: null }} />
      <Tabs.Screen name="admin/identity-verifications" options={{ href: null }} />
      <Tabs.Screen name="admin/property-review/[id]" options={{ href: null }} />
      <Tabs.Screen name="admin/identity-review/[id]" options={{ href: null }} />
    </Tabs>
  );
}
