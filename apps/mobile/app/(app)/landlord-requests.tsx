import { useCallback, useMemo, useState } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

type Row = {
  id: string;
  title: string;
  description: string;
  category: RequestCategory;
  priority: RequestPriority;
  status: RequestStatus;
  created_at: string;
  tenant_name: string;
  address: string;
};

const STATUS_TABS: { key: 'all' | RequestStatus; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'open', label: 'Offen' },
  { key: 'in_progress', label: 'In Arbeit' },
  { key: 'resolved', label: 'Behoben' },
  { key: 'closed', label: 'Geschlossen' },
];

/** Vermieter-/Admin-Sicht aller Mängel mit Such-/Filterbar, Statistik-Header. */
export default function LandlordRequestsScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    let q = supabase
      .from('requests')
      .select(
        'id, title, description, category, priority, status, created_at, ' +
          'tenancies(profiles:tenant_id(full_name), units(unit_label, properties(street, house_number, city)))',
      )
      .order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    setRows(
      (data ?? []).map((r) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rr: any = r;
        const t = rr.tenancies;
        const unit = t?.units;
        const prop = unit?.properties;
        return {
          id: rr.id,
          title: rr.title,
          description: rr.description ?? '',
          category: rr.category,
          priority: rr.priority,
          status: rr.status,
          created_at: rr.created_at,
          tenant_name: t?.profiles?.full_name ?? '—',
          address: prop ? `${prop.street} ${prop.house_number}, ${prop.city}` : '—',
        };
      }),
    );
    setLoading(false);
  }, [statusFilter]);

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.tenant_name.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const counts = useMemo(() => {
    const c = { open: 0, in_progress: 0, urgent: 0 };
    for (const r of rows) {
      if (r.status === 'open') c.open += 1;
      if (r.status === 'in_progress') c.in_progress += 1;
      if (r.priority === 'urgent' && (r.status === 'open' || r.status === 'in_progress'))
        c.urgent += 1;
    }
    return c;
  }, [rows]);

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        contentContainerClassName="p-4 gap-3 pb-10"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View className="mb-2 gap-3">
            <View>
              <Text className="text-2xl font-bold text-foreground">Mängel</Text>
              <Text className="text-sm text-muted-foreground">
                {rows.length} Anfrage(n) · {counts.open} offen · {counts.in_progress} in Arbeit
                {counts.urgent ? ` · ${counts.urgent} dringend` : ''}
              </Text>
            </View>

            <Input
              value={search}
              onChangeText={setSearch}
              placeholder="Anfrage / Mieter / Adresse suchen…"
              autoCapitalize="none"
            />

            <View className="flex-row flex-wrap gap-2">
              {STATUS_TABS.map((t) => {
                const active = statusFilter === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => setStatusFilter(t.key)}
                    className={`rounded-full border px-3 py-1.5 ${
                      active
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        active ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <Card>
              <CardContent className="items-center gap-3 py-12">
                <Ionicons name="checkmark-done-outline" size={48} color="#16a34a" />
                <Text className="text-lg font-semibold text-foreground">
                  Keine Anfragen gefunden
                </Text>
                <Text className="text-center text-sm text-muted-foreground">
                  Mit den aktuellen Filtern liegt nichts an.
                </Text>
              </CardContent>
            </Card>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/(app)/request/[id]', params: { id: item.id } })
            }
          >
            <Card>
              <CardContent className="gap-2 p-4">
                <View className="flex-row items-start justify-between gap-2">
                  <Text
                    className="flex-1 text-base font-semibold text-foreground"
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <PriorityBadge priority={item.priority} />
                </View>
                {item.description ? (
                  <Text className="text-sm text-muted-foreground" numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                <View className="flex-row flex-wrap items-center gap-2">
                  <Badge variant="outline">{REQUEST_CATEGORY_LABELS_DE[item.category]}</Badge>
                  <StatusBadge status={item.status} />
                </View>
                <View className="mt-1 flex-row items-center justify-between gap-2">
                  <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                    {item.tenant_name} · {item.address}
                  </Text>
                  <Text className="text-[11px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString('de-DE')}
                  </Text>
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
