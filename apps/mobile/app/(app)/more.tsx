import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter, useFocusEffect, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VerifiedBadge } from '@/components/ui/verified-badge';

type NavEntry = {
  href: Href;
  label: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  premium?: boolean;
  badge?: number;
};

type NavSection = { title: string; entries: NavEntry[] };

/**
 * "Mehr"-Hub — mobiles Pendant zum Web-Dashboard-Drawer.
 * Rollenbasierte Sektionen, identische Feature-Liste wie lib/dashboard-nav.ts (Web).
 */
export default function MoreScreen() {
  const router = useRouter();
  const { profile, session, signOut } = useAuth();
  const [identityVerified, setIdentityVerified] = useState(false);
  const [pendingReviews, setPendingReviews] = useState({ properties: 0, identities: 0 });

  const role = profile?.role ?? 'tenant';
  const isAdmin = role === 'admin';
  const isLandlord = role === 'landlord';
  const isTenant = role === 'tenant';

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        if (!session?.user?.id) return;
        const { data: me } = await supabase
          .from('profiles')
          .select('identity_verified_at')
          .eq('id', session.user.id)
          .single();
        setIdentityVerified(!!me?.identity_verified_at);

        if (isAdmin) {
          const { count: pProps } = await supabase
            .from('properties')
            .select('id', { count: 'exact', head: true })
            .eq('ownership_status', 'pending');
          const { data: idDocs } = await supabase
            .from('identity_documents')
            .select('user_id, profiles:user_id(identity_verified_at)');
          const unique = new Set(
            (idDocs ?? [])
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((d: any) => !d.profiles?.identity_verified_at)
              .map((d) => d.user_id),
          );
          setPendingReviews({ properties: pProps ?? 0, identities: unique.size });
        }
      })();
    }, [session?.user?.id, isAdmin]),
  );

  const sections: NavSection[] = [];

  if (isTenant) {
    sections.push({
      title: 'Meine Wohnung',
      entries: [
        {
          href: '/(app)/join',
          label: 'Weitere Wohnung hinzufügen',
          description: 'Einladungscode einlösen',
          icon: 'key-outline',
        },
      ],
    });
  }

  if (isLandlord || isAdmin) {
    const landlordEntries: NavEntry[] = [];
    if (isLandlord && !identityVerified) {
      landlordEntries.push({
        href: '/(app)/verify-identity',
        label: 'Identität verifizieren',
        description: 'Pflicht vor der ersten Immobilie',
        icon: 'shield-checkmark-outline',
      });
    }
    landlordEntries.push(
      {
        href: '/(app)/tenants',
        label: 'Meine Mieter',
        description: 'Alle Mietverhältnisse im Überblick',
        icon: 'people-outline',
      },
      {
        href: '/(app)/managers',
        label: 'Hausverwaltung',
        description: 'Verwalter einladen & Rechte steuern',
        icon: 'briefcase-outline',
      },
      {
        href: '/(app)/handover' as Href,
        label: 'Übergabeprotokoll',
        description: 'Wohnungsübergaben dokumentieren',
        icon: 'document-attach-outline',
        premium: true,
      },
      {
        href: '/(app)/vault',
        label: 'Dokumenten-Tresor',
        description: 'Verträge & Dokumente teilen',
        icon: 'folder-open-outline',
      },
      {
        href: '/(app)/appointments',
        label: 'Terminplaner',
        description: 'Slots für Mieter anbieten',
        icon: 'calendar-outline',
        premium: true,
      },
    );
    sections.push({ title: 'Verwaltung', entries: landlordEntries });
  }

  if (isAdmin) {
    sections.push({
      title: 'Administration',
      entries: [
        {
          href: '/(app)/admin/users',
          label: 'Alle User',
          description: 'Konten einsehen & verwalten',
          icon: 'people-circle-outline',
        },
        {
          href: '/(app)/admin/support-inbox',
          label: 'Support-Postfach',
          description: 'Nutzer-Anfragen beantworten',
          icon: 'mail-unread-outline',
        },
        {
          href: '/(app)/admin/property-verifications',
          label: 'Immobilien-Prüfung',
          icon: 'business-outline',
          badge: pendingReviews.properties,
        },
        {
          href: '/(app)/admin/identity-verifications',
          label: 'Identitäts-Prüfung',
          icon: 'finger-print-outline',
          badge: pendingReviews.identities,
        },
      ],
    });
  }

  sections.push({
    title: 'Konto',
    entries: [
      {
        href: '/(app)/profile',
        label: 'Mein Profil',
        icon: 'person-circle-outline',
      },
      {
        href: '/(app)/support',
        label: 'Hilfe & Support',
        icon: 'help-buoy-outline',
      },
    ],
  });

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="p-4 gap-5 pb-10">
      {/* User-Karte oben */}
      <Card>
        <CardContent className="flex-row items-center gap-3 p-4">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Text className="text-lg font-bold text-primary">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                {profile?.full_name ?? '—'}
              </Text>
              {identityVerified && <VerifiedBadge size={14} />}
            </View>
            <Badge variant={isAdmin ? 'destructive' : isLandlord ? 'info' : 'secondary'}>
              {isAdmin ? 'Administrator' : isLandlord ? 'Vermieter' : 'Mieter'}
            </Badge>
          </View>
        </CardContent>
      </Card>

      {sections.map((section) => (
        <View key={section.title} className="gap-2">
          <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </Text>
          <Card>
            <View>
              {section.entries.map((entry, i) => (
                <Pressable
                  key={entry.label}
                  onPress={() => router.push(entry.href)}
                  className={`flex-row items-center gap-3 px-4 py-3.5 active:bg-accent ${
                    i < section.entries.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Ionicons name={entry.icon} size={18} color="#2563eb" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-medium text-foreground">{entry.label}</Text>
                      {entry.premium && (
                        <View className="rounded bg-amber-100 px-1.5 py-0.5">
                          <Text className="text-[9px] font-bold uppercase tracking-wider text-amber-800">
                            Pro
                          </Text>
                        </View>
                      )}
                    </View>
                    {entry.description && (
                      <Text className="text-xs text-muted-foreground">{entry.description}</Text>
                    )}
                  </View>
                  {entry.badge != null && entry.badge > 0 && (
                    <Badge variant="warning">{entry.badge}</Badge>
                  )}
                  <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                </Pressable>
              ))}
            </View>
          </Card>
        </View>
      ))}

      <Pressable
        onPress={signOut}
        className="flex-row items-center justify-center gap-2 rounded-lg border border-border bg-white p-3.5 active:bg-accent"
      >
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text className="text-sm font-medium text-destructive">Abmelden</Text>
      </Pressable>

      <Text className="text-center text-xs text-muted-foreground">
        Mieter + · Eine App von ADB
      </Text>
    </ScrollView>
  );
}
