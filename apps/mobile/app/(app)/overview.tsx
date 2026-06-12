import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Stats = {
  properties: number;
  propertiesPending: number;
  openRequests: number;
  urgentRequests: number;
  pendingPropertyReviews: number;
  pendingIdentityReviews: number;
};

export default function OverviewScreen() {
  const router = useRouter();
  const { profile, session } = useAuth();
  const [stats, setStats] = useState<Stats>({
    properties: 0,
    propertiesPending: 0,
    openRequests: 0,
    urgentRequests: 0,
    pendingPropertyReviews: 0,
    pendingIdentityReviews: 0,
  });
  const [identityVerified, setIdentityVerified] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    const isAdmin = profile?.role === 'admin';

    const propsQ = supabase.from('properties').select('id, ownership_status', { count: 'exact' });
    const ownPropsQ = isAdmin ? propsQ : propsQ.eq('owner_id', session.user.id);
    const { data: props } = await ownPropsQ;

    const propertiesPending = (props ?? []).filter((p) => p.ownership_status === 'pending').length;

    let openReqQuery = supabase
      .from('requests')
      .select('id, priority, status', { count: 'exact' })
      .in('status', ['open', 'in_progress']);
    if (!isAdmin) {
      const propIds = (props ?? []).map((p) => p.id);
      if (propIds.length > 0) {
        const { data: tenancyIds } = await supabase
          .from('tenancies')
          .select('id, unit_id, units!inner(property_id)')
          .in(
            'unit_id',
            (
              await supabase
                .from('units')
                .select('id')
                .in('property_id', propIds)
            ).data?.map((u) => u.id) ?? [],
          );
        const tIds = (tenancyIds ?? []).map((t) => t.id);
        if (tIds.length > 0) {
          openReqQuery = openReqQuery.in('tenancy_id', tIds);
        } else {
          openReqQuery = openReqQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      } else {
        openReqQuery = openReqQuery.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }
    const { data: reqs } = await openReqQuery;
    const urgent = (reqs ?? []).filter((r) => r.priority === 'urgent').length;

    const { data: meRow } = await supabase
      .from('profiles')
      .select('identity_verified_at')
      .eq('id', session.user.id)
      .single();
    setIdentityVerified(!!meRow?.identity_verified_at);

    let pendingPropertyReviews = 0;
    let pendingIdentityReviews = 0;
    if (isAdmin) {
      const { count: pProps } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('ownership_status', 'pending');
      pendingPropertyReviews = pProps ?? 0;

      const { data: idDocs } = await supabase
        .from('identity_documents')
        .select('user_id, profiles:user_id(identity_verified_at)')
        .order('uploaded_at', { ascending: false });
      const unique = new Set(
        (idDocs ?? [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((d: any) => !d.profiles?.identity_verified_at)
          .map((d) => d.user_id),
      );
      pendingIdentityReviews = unique.size;
    }

    setStats({
      properties: props?.length ?? 0,
      propertiesPending,
      openRequests: reqs?.length ?? 0,
      urgentRequests: urgent,
      pendingPropertyReviews,
      pendingIdentityReviews,
    });
  }, [session?.user?.id, profile?.role]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="p-4 gap-4"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View>
        <Text className="text-2xl font-bold text-foreground">
          Hallo {profile?.full_name?.split(' ')[0] ?? '!'}
        </Text>
        <Text className="text-muted-foreground">
          {isAdmin ? 'Dein System-Überblick' : 'Dein Vermieter-Überblick'}
        </Text>
      </View>

      {!isAdmin && !identityVerified && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="gap-2">
            <View className="flex-row items-start gap-3">
              <Ionicons name="shield-outline" size={24} color="#d97706" />
              <View className="flex-1">
                <CardTitle className="text-base">Identität nicht verifiziert</CardTitle>
                <CardDescription>
                  Bevor du Immobilien anlegen kannst, müssen wir deine Identität prüfen.
                </CardDescription>
              </View>
            </View>
          </CardHeader>
          <CardContent>
            <Button fullWidth onPress={() => router.push('/(app)/verify-identity')}>
              Identität verifizieren
            </Button>
          </CardContent>
        </Card>
      )}

      <View className="flex-row flex-wrap gap-3">
        <StatCard
          title="Immobilien"
          value={stats.properties}
          icon="business-outline"
          onPress={() => router.push('/(app)/properties')}
        />
        <StatCard
          title="In Prüfung"
          value={stats.propertiesPending}
          icon="time-outline"
          variant={stats.propertiesPending > 0 ? 'warning' : 'default'}
          onPress={() => router.push('/(app)/properties')}
        />
        <StatCard
          title="Offene Mängel"
          value={stats.openRequests}
          icon="construct-outline"
          onPress={() => router.push('/(app)/landlord-requests')}
        />
        <StatCard
          title="Dringend"
          value={stats.urgentRequests}
          icon="alert-circle-outline"
          variant={stats.urgentRequests > 0 ? 'destructive' : 'default'}
          onPress={() => router.push('/(app)/landlord-requests')}
        />
      </View>

      {(profile?.role === 'landlord' || isAdmin) && (
        <View className="gap-3 mt-4">
          <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Vermieter-Werkzeuge
          </Text>

          <Pressable onPress={() => router.push('/(app)/vault')}>
            <Card>
              <CardContent className="flex-row items-center gap-3 p-4">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Ionicons name="folder-outline" size={20} color="#2563eb" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-foreground">Dokumenten-Tresor</Text>
                  <Text className="text-xs text-muted-foreground">
                    Dokumente sicher teilen
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </CardContent>
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push('/(app)/appointments')}>
            <Card>
              <CardContent className="flex-row items-center gap-3 p-4">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <Ionicons name="calendar-outline" size={20} color="#d97706" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-foreground">Terminplaner</Text>
                  <Text className="text-xs text-muted-foreground">
                    Besichtigungen & Termine
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </CardContent>
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push('/(app)/managers')}>
            <Card>
              <CardContent className="flex-row items-center gap-3 p-4">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <Ionicons name="people-outline" size={20} color="#16a34a" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-foreground">Hausverwaltung</Text>
                  <Text className="text-xs text-muted-foreground">
                    Verwalter einladen
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </CardContent>
            </Card>
          </Pressable>
        </View>
      )}

      {isAdmin && (
        <View className="gap-3">
          <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Admin
          </Text>
          <Pressable onPress={() => router.push('/(app)/admin/property-verifications')}>
            <Card>
              <CardContent className="flex-row items-center gap-3 p-4">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Ionicons name="shield-checkmark-outline" size={20} color="#2563eb" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-foreground">Immobilien-Prüfungen</Text>
                  <Text className="text-xs text-muted-foreground">
                    {stats.pendingPropertyReviews} offen
                  </Text>
                </View>
                {stats.pendingPropertyReviews > 0 && (
                  <Badge variant="warning">{stats.pendingPropertyReviews}</Badge>
                )}
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </CardContent>
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push('/(app)/admin/identity-verifications')}>
            <Card>
              <CardContent className="flex-row items-center gap-3 p-4">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Ionicons name="person-circle-outline" size={20} color="#2563eb" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-foreground">Identitäts-Prüfungen</Text>
                  <Text className="text-xs text-muted-foreground">
                    {stats.pendingIdentityReviews} offen
                  </Text>
                </View>
                {stats.pendingIdentityReviews > 0 && (
                  <Badge variant="warning">{stats.pendingIdentityReviews}</Badge>
                )}
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </CardContent>
            </Card>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({
  title,
  value,
  icon,
  onPress,
  variant = 'default',
}: {
  title: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  variant?: 'default' | 'warning' | 'destructive';
}) {
  const borderColor =
    variant === 'destructive'
      ? 'border-destructive/40'
      : variant === 'warning'
        ? 'border-amber-300'
        : '';
  return (
    <Pressable onPress={onPress} style={{ flexBasis: '47%' }}>
      <Card className={borderColor}>
        <CardContent className="gap-2 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-medium text-muted-foreground">{title}</Text>
            <Ionicons name={icon} size={16} color="#64748b" />
          </View>
          <Text className="text-3xl font-bold text-foreground">{value}</Text>
        </CardContent>
      </Card>
    </Pressable>
  );
}
