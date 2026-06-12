import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VerifiedBadge } from '@/components/ui/verified-badge';

type Property = {
  id: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  ownership_status: string;
  rejection_reason: string | null;
  owner_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles?: { full_name?: string; identity_verified_at?: string | null } | any;
};

export default function PropertiesScreen() {
  const router = useRouter();
  const { profile, session } = useAuth();
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [identityVerified, setIdentityVerified] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    let q = supabase
      .from('properties')
      .select(
        'id, street, house_number, postal_code, city, ownership_status, rejection_reason, owner_id, profiles:owner_id(full_name, identity_verified_at)',
      )
      .order('created_at', { ascending: false });
    if (!isAdmin) q = q.eq('owner_id', session.user.id);
    const { data } = await q;
    setItems((data ?? []) as unknown as Property[]);

    const { data: me } = await supabase
      .from('profiles')
      .select('identity_verified_at')
      .eq('id', session.user.id)
      .single();
    setIdentityVerified(!!me?.identity_verified_at);

    setLoading(false);
  }, [session?.user?.id, isAdmin]);

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

  const canCreate = !isAdmin && identityVerified;

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerClassName="p-4 gap-3"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View className="mb-2 flex-row items-end justify-between">
            <View>
              <Text className="text-2xl font-bold text-foreground">
                {isAdmin ? 'Alle Immobilien' : 'Meine Immobilien'}
              </Text>
              <Text className="text-sm text-muted-foreground">
                {items.length} Immobilie(n){isAdmin ? ' systemweit' : ''}
              </Text>
            </View>
            {canCreate && (
              <Button size="sm" onPress={() => router.push('/(app)/new-property')}>
                <View className="flex-row items-center gap-1">
                  <Ionicons name="add" size={16} color="white" />
                  <Text className="text-sm font-medium text-primary-foreground">Neu</Text>
                </View>
              </Button>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <Card>
              <CardContent className="items-center py-12 gap-3">
                <Ionicons name="business-outline" size={48} color="#94a3b8" />
                <Text className="text-lg font-semibold text-foreground">
                  {isAdmin ? 'Keine Immobilien im System' : 'Noch keine Immobilie'}
                </Text>
                <Text className="text-center text-sm text-muted-foreground">
                  {isAdmin
                    ? 'Sobald Vermieter Immobilien anlegen, erscheinen sie hier.'
                    : identityVerified
                      ? 'Lege deine erste Immobilie an.'
                      : 'Verifiziere erst deine Identität, dann kannst du Immobilien anlegen.'}
                </Text>
                {!isAdmin && !identityVerified && (
                  <Button onPress={() => router.push('/(app)/verify-identity')}>
                    Identität verifizieren
                  </Button>
                )}
                {!isAdmin && identityVerified && (
                  <Button onPress={() => router.push('/(app)/new-property')}>
                    Erste Immobilie anlegen
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/(app)/property/[id]', params: { id: item.id } })
            }
          >
            <Card>
              <CardContent className="gap-2 p-4">
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-base font-semibold text-foreground">
                        {item.street} {item.house_number}
                      </Text>
                      {item.ownership_status === 'verified' && <VerifiedBadge size={14} />}
                    </View>
                    <Text className="text-sm text-muted-foreground">
                      {item.postal_code} {item.city}
                    </Text>
                    {isAdmin && item.profiles && (
                      <View className="mt-1 flex-row items-center gap-1">
                        <Text className="text-xs text-muted-foreground">
                          Vermieter: {item.profiles.full_name}
                        </Text>
                        {item.profiles.identity_verified_at && (
                          <VerifiedBadge size={10} />
                        )}
                      </View>
                    )}
                  </View>
                  {item.ownership_status !== 'verified' && (
                    <StatusBadge status={item.ownership_status} />
                  )}
                </View>
                {item.ownership_status === 'rejected' && item.rejection_reason && (
                  <View className="mt-1 rounded-md bg-destructive/10 p-2">
                    <Text className="text-xs text-destructive">
                      Abgelehnt: {item.rejection_reason}
                    </Text>
                  </View>
                )}
              </CardContent>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'rejected') return <Badge variant="destructive">Abgelehnt</Badge>;
  return <Badge variant="warning">In Prüfung</Badge>;
}
