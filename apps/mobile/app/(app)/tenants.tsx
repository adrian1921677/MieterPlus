import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type TenancyRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  tenant_name: string;
  unit_label: string;
  address: string;
};

/**
 * Mieter-Übersicht für Vermieter (eigene Properties) bzw. Admin (alle).
 * Web-Pendant: /dashboard/tenants. RLS filtert serverseitig.
 */
export default function TenantsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [rows, setRows] = useState<TenancyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('tenancies')
      .select(
        'id, started_at, ended_at, profiles:tenant_id(full_name), units(unit_label, properties(street, house_number, postal_code, city))',
      )
      .order('started_at', { ascending: false });

    setRows(
      (data ?? []).map((t) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tt: any = t;
        const unit = tt.units;
        const prop = unit?.properties;
        return {
          id: tt.id,
          started_at: tt.started_at,
          ended_at: tt.ended_at,
          tenant_name: tt.profiles?.full_name ?? 'Unbekannt',
          unit_label: unit?.unit_label ?? '—',
          address: prop
            ? `${prop.street} ${prop.house_number}, ${prop.postal_code} ${prop.city}`
            : '—',
        };
      }),
    );
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

  const isAdmin = profile?.role === 'admin';

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerClassName="p-4 gap-3"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View className="mb-2">
            <Pressable
              onPress={() => router.back()}
              className="mb-3 flex-row items-center gap-2"
            >
              <Ionicons name="chevron-back" size={18} color="#2563eb" />
              <Text className="text-sm font-medium text-primary">Zurück</Text>
            </Pressable>
            <Text className="text-2xl font-bold text-foreground">
              {isAdmin ? 'Alle Mieter' : 'Meine Mieter'}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {rows.length} Mietverhältnis(se){isAdmin ? ' systemweit' : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <Card>
              <CardContent className="items-center gap-3 py-12">
                <Ionicons name="people-outline" size={48} color="#94a3b8" />
                <Text className="text-lg font-semibold text-foreground">Noch keine Mieter</Text>
                <Text className="text-center text-sm text-muted-foreground">
                  Sobald Mieter einen Einladungscode einlösen, erscheinen sie hier.
                </Text>
              </CardContent>
            </Card>
          )
        }
        renderItem={({ item }) => (
          <Card>
            <CardContent className="gap-2 p-4">
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">
                    {item.tenant_name}
                  </Text>
                  <Text className="text-xs text-muted-foreground">{item.address}</Text>
                  <Text className="text-xs text-muted-foreground">{item.unit_label}</Text>
                </View>
                <Badge variant={item.ended_at ? 'secondary' : 'success'}>
                  {item.ended_at ? 'Beendet' : 'Aktiv'}
                </Badge>
              </View>
              <Text className="text-[11px] text-muted-foreground">
                Eingezogen am {new Date(item.started_at).toLocaleDateString('de-DE')}
                {item.ended_at &&
                  ` · Ausgezogen am ${new Date(item.ended_at).toLocaleDateString('de-DE')}`}
              </Text>
            </CardContent>
          </Card>
        )}
      />
    </View>
  );
}
