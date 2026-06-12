import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  REQUEST_CATEGORY_LABELS_DE,
  REQUEST_PRIORITY_LABELS_DE,
  REQUEST_STATUS_LABELS_DE,
  type RequestCategory,
  type RequestPriority,
  type RequestStatus,
} from '@mieterplus/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type RequestItem = {
  id: string;
  title: string;
  category: RequestCategory;
  priority: RequestPriority;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
};

export default function RequestsScreen() {
  const router = useRouter();
  const { tenancy, home, profile } = useAuth();
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!tenancy) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('requests')
      .select('id, title, category, priority, status, created_at, updated_at')
      .eq('tenancy_id', tenancy.id)
      .order('created_at', { ascending: false });
    setItems((data ?? []) as RequestItem[]);
    setLoading(false);
  }, [tenancy]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!tenancy) return;
    const channel = supabase
      .channel(`requests:tenancy:${tenancy.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests', filter: `tenancy_id=eq.${tenancy.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenancy, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openCount = items.filter(
    (i) => i.status === 'open' || i.status === 'in_progress',
  ).length;

  const Header = (
    <View className="gap-4">
      {/* Adresse-Card im Web-Stil (blau, prominent) */}
      <View className="rounded-lg bg-primary p-5">
        <Text className="text-xs font-semibold uppercase tracking-wider text-blue-100">
          Deine Wohnung
        </Text>
        {home ? (
          <>
            <Text className="mt-1 text-2xl font-bold text-white">
              {home.street} {home.house_number}
            </Text>
            <Text className="mt-0.5 text-base text-blue-100">
              {home.postal_code} {home.city}
            </Text>
            <Text className="mt-1 text-sm text-blue-100">{home.unit_label}</Text>
            {home.landlord_name && (
              <View className="mt-3 flex-row items-center gap-2 border-t border-blue-400/40 pt-3">
                <Ionicons name="person-outline" size={14} color="#dbeafe" />
                <Text className="text-xs text-blue-100">
                  Vermieter: {home.landlord_name}
                </Text>
              </View>
            )}
          </>
        ) : (
          <Text className="mt-1 text-lg text-blue-100">Hallo {profile?.full_name}</Text>
        )}
      </View>

      <View className="flex-row items-end justify-between">
        <View>
          <Text className="text-lg font-semibold text-foreground">Mängel & Aufträge</Text>
          <Text className="text-sm text-muted-foreground">
            {items.length} Anfrage(n) gesamt
          </Text>
        </View>
        {openCount > 0 && <Badge variant="warning">{openCount} offen</Badge>}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <Text className="text-muted-foreground">Lädt…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={Header}
        ListHeaderComponentStyle={{ marginBottom: 12 }}
        contentContainerClassName="p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={
          <Card>
            <CardContent className="items-center py-12">
              <Ionicons name="checkmark-circle-outline" size={56} color="#94a3b8" />
              <Text className="mt-3 text-lg font-semibold text-foreground">
                Alles in Ordnung
              </Text>
              <Text className="mt-1 text-center text-sm text-muted-foreground">
                Du hast aktuell keine offenen Mängel.
              </Text>
              <Button
                className="mt-5"
                onPress={() => router.push('/(app)/new-request')}
              >
                Ersten Mangel melden
              </Button>
            </CardContent>
          </Card>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/(app)/request/[id]', params: { id: item.id } })
            }
          >
            <Card>
              <CardContent className="p-4">
                <View className="flex-row items-start justify-between gap-2">
                  <Text className="flex-1 text-base font-semibold text-foreground">
                    {item.title}
                  </Text>
                  <PriorityBadge priority={item.priority} />
                </View>
                <View className="mt-2 flex-row flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {REQUEST_CATEGORY_LABELS_DE[item.category]}
                  </Badge>
                  <StatusBadge status={item.status} />
                </View>
              </CardContent>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const variant: Record<RequestStatus, 'info' | 'warning' | 'success' | 'secondary' | 'destructive'> = {
    open: 'info',
    in_progress: 'warning',
    resolved: 'success',
    closed: 'secondary',
    rejected: 'destructive',
  };
  return <Badge variant={variant[status]}>{REQUEST_STATUS_LABELS_DE[status]}</Badge>;
}

function PriorityBadge({ priority }: { priority: RequestPriority }) {
  if (priority === 'urgent') return <Badge variant="destructive">Dringend</Badge>;
  if (priority === 'high') return <Badge variant="warning">Hoch</Badge>;
  if (priority === 'low') return <Badge variant="secondary">Niedrig</Badge>;
  return <Badge variant="outline">{REQUEST_PRIORITY_LABELS_DE[priority]}</Badge>;
}
