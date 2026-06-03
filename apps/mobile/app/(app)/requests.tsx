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
  const { tenancy } = useAuth();
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!tenancy) return;
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

  return (
    <View className="flex-1 bg-gray-50">
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Lädt…</Text>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="checkmark-circle-outline" size={64} color="#9ca3af" />
          <Text className="mt-4 text-center text-lg font-semibold">Noch keine Mängel</Text>
          <Text className="mt-1 text-center text-gray-500">
            Tippe auf „Neu melden", um deinem Vermieter einen Mangel oder Auftrag zu melden.
          </Text>
          <Pressable
            onPress={() => router.push('/(app)/new-request')}
            className="mt-6 rounded-lg bg-primary px-6 py-3"
          >
            <Text className="font-semibold text-white">Ersten Mangel melden</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/(app)/request/[id]', params: { id: item.id } })}
              className="rounded-xl bg-white p-4 shadow-sm active:bg-gray-50"
            >
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 text-base font-semibold">{item.title}</Text>
                <PriorityChip priority={item.priority} />
              </View>
              <View className="mt-2 flex-row flex-wrap items-center gap-2">
                <Chip label={REQUEST_CATEGORY_LABELS_DE[item.category]} tone="muted" />
                <StatusChip status={item.status} />
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function Chip({ label, tone }: { label: string; tone: 'muted' | 'info' | 'warning' | 'success' | 'danger' }) {
  const toneMap = {
    muted: 'bg-gray-100 text-gray-700',
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-amber-100 text-amber-800',
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
  } as const;
  return (
    <View className={`rounded-full px-2 py-0.5 ${toneMap[tone].split(' ')[0]}`}>
      <Text className={`text-xs font-medium ${toneMap[tone].split(' ')[1]}`}>{label}</Text>
    </View>
  );
}

function StatusChip({ status }: { status: RequestStatus }) {
  const toneMap: Record<RequestStatus, 'info' | 'warning' | 'success' | 'muted' | 'danger'> = {
    open: 'info',
    in_progress: 'warning',
    resolved: 'success',
    closed: 'muted',
    rejected: 'danger',
  };
  return <Chip label={REQUEST_STATUS_LABELS_DE[status]} tone={toneMap[status]} />;
}

function PriorityChip({ priority }: { priority: RequestPriority }) {
  if (priority === 'urgent') return <Chip label="Dringend" tone="danger" />;
  if (priority === 'high') return <Chip label="Hoch" tone="warning" />;
  if (priority === 'low') return <Chip label="Niedrig" tone="muted" />;
  return <Chip label={REQUEST_PRIORITY_LABELS_DE[priority]} tone="info" />;
}
