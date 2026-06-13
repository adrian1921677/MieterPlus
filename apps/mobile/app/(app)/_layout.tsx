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

// Routen, die nie als Tab erscheinen (Detail-/Stack-Routen)
const HIDDEN_ROUTES = [
  'landlord-info',
  'request/[id]',
  'property/[id]',
  'new-property',
  'verify-identity',
  'support',
  'profile',
  'join',
  'tenants',
  'handover/index',
  'vault/index',
  'vault/new',
  'vault/[id]',
  'appointments/index',
  'appointments/new',
  'appointments/[id]',
  'managers/index',
  'managers/new',
  'managers/[id]',
  'admin/users',
  'admin/support-inbox',
  'admin/support-thread/[userId]',
  'admin/property-verifications',
  'admin/identity-verifications',
  'admin/property-review/[id]',
  'admin/identity-review/[id]',
];

export default function AppLayout() {
  const { session, profile } = useAuth();

  useEffect(() => {
    if (session?.user?.id) void registerPushToken(session.user.id);
  }, [session?.user?.id]);

  const isLandlordOrAdmin = profile?.role === 'landlord' || profile?.role === 'admin';

  const hidden = HIDDEN_ROUTES.map((name) => (
    <Tabs.Screen key={name} name={name} options={{ href: null }} />
  ));

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
          name="more"
          options={{
            title: 'Mehr',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" color={color} size={size} />
            ),
          }}
        />
        {/* Mieter-Routen verstecken */}
        <Tabs.Screen name="requests" options={{ href: null }} />
        <Tabs.Screen name="new-request" options={{ href: null }} />
        <Tabs.Screen name="my-documents" options={{ href: null }} />
        <Tabs.Screen name="my-appointments" options={{ href: null }} />
        {hidden}
      </Tabs>
    );
  }

  // ── Mieter-Tabs ──────────────────────────────────────────
  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Übersicht',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
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
        name="my-documents"
        options={{
          title: 'Dokumente',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder-open-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-appointments"
        options={{
          title: 'Termine',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Mehr',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" color={color} size={size} />
          ),
        }}
      />
      {/* Vermieter-Routen verstecken */}
      <Tabs.Screen name="overview" options={{ href: null }} />
      <Tabs.Screen name="properties" options={{ href: null }} />
      <Tabs.Screen name="landlord-requests" options={{ href: null }} />
      {hidden}
    </Tabs>
  );
}
