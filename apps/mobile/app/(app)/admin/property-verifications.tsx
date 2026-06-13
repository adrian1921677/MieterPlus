import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Row = {
  id: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  created_at: string;
  landlord_name: string;
};

/** Admin: Property-Verifikationen-Queue. */
export default function PropertyVerificationsScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('properties')
      .select(
        'id, street, house_number, postal_code, city, created_at, profiles:owner_id(full_name)',
      )
      .eq('ownership_status', 'pending')
      .order('created_at', { ascending: false });

    if (!error) {
      setRows(
        (data ?? []).map((p) => ({
          id: p.id,
          street: p.street,
          house_number: p.house_number,
          postal_code: p.postal_code,
          city: p.city,
          created_at: p.created_at,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          landlord_name: (p as any).profiles?.full_name ?? 'Unbekannt',
        })),
      );
    }
    setLoading(false);
  }, []);

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

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerClassName="p-4 gap-3"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View className="mb-2">
            <Pressable onPress={() => router.back()} className="mb-3 flex-row items-center gap-2">
              <Ionicons name="chevron-back" size={18} color="#2563eb" />
              <Text className="text-sm font-medium text-primary">Zurück</Text>
            </Pressable>
            <Text className="text-2xl font-bold text-foreground">Immobilien-Prüfungen</Text>
            <Text className="text-sm text-muted-foreground">
              {rows.length} ausstehend
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <Card>
              <CardContent className="items-center gap-3 py-12">
                <Ionicons name="checkmark-done-outline" size={48} color="#16a34a" />
                <Text className="text-lg font-semibold text-foreground">Alles erledigt</Text>
                <Text className="text-center text-sm text-muted-foreground">
                  Keine offenen Prüfungen.
                </Text>
              </CardContent>
            </Card>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(app)/admin/property-review/[id]',
                params: { id: item.id },
              })
            }
          >
            <Card>
              <CardContent className="gap-2 p-4">
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">
                      {item.street} {item.house_number}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {item.postal_code} {item.city}
                    </Text>
                  </View>
                  <Badge variant="warning">Ausstehend</Badge>
                </View>
                <Text className="text-[11px] text-muted-foreground">
                  Eingereicht von {item.landlord_name} ·{' '}
                  {new Date(item.created_at).toLocaleDateString('de-DE')}
                </Text>
              </CardContent>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
