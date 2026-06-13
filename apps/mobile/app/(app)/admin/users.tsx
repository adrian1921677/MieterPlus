import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { VerifiedBadge } from '@/components/ui/verified-badge';

type UserRow = {
  id: string;
  full_name: string;
  role: string;
  identity_verified: boolean;
  subscription_plan: string | null;
  created_at: string;
};

/** Admin: alle User — Web-Pendant /dashboard/admin/users. */
export default function AdminUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, identity_verified_at, subscription_plan, created_at')
      .order('created_at', { ascending: false });
    setUsers(
      (data ?? []).map((u) => ({
        id: u.id,
        full_name: u.full_name,
        role: u.role,
        identity_verified: !!u.identity_verified_at,
        subscription_plan: u.subscription_plan ?? null,
        created_at: u.created_at,
      })),
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

  const filtered = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={filtered}
        keyExtractor={(u) => u.id}
        contentContainerClassName="p-4 gap-3"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View className="mb-2 gap-3">
            <Pressable
              onPress={() => router.back()}
              className="flex-row items-center gap-2"
            >
              <Ionicons name="chevron-back" size={18} color="#2563eb" />
              <Text className="text-sm font-medium text-primary">Zurück</Text>
            </Pressable>
            <View>
              <Text className="text-2xl font-bold text-foreground">Alle User</Text>
              <Text className="text-sm text-muted-foreground">
                {users.length} Konto/Konten registriert
              </Text>
            </View>
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder="Nach Name suchen…"
              autoCapitalize="none"
            />
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <Card>
              <CardContent className="items-center gap-3 py-12">
                <Ionicons name="people-circle-outline" size={48} color="#94a3b8" />
                <Text className="text-lg font-semibold text-foreground">Keine User gefunden</Text>
              </CardContent>
            </Card>
          )
        }
        renderItem={({ item }) => (
          <Card>
            <CardContent className="flex-row items-center gap-3 p-4">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Text className="text-base font-bold text-primary">
                  {item.full_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                    {item.full_name}
                  </Text>
                  {item.identity_verified && <VerifiedBadge size={13} />}
                </View>
                <View className="mt-1 flex-row items-center gap-2">
                  <Badge
                    variant={
                      item.role === 'admin'
                        ? 'destructive'
                        : item.role === 'landlord'
                          ? 'info'
                          : 'secondary'
                    }
                  >
                    {item.role === 'admin'
                      ? 'Admin'
                      : item.role === 'landlord'
                        ? 'Vermieter'
                        : 'Mieter'}
                  </Badge>
                  {item.subscription_plan && item.subscription_plan !== 'free' && (
                    <Badge variant="warning">{item.subscription_plan}</Badge>
                  )}
                </View>
              </View>
              <Text className="text-[10px] text-muted-foreground">
                {new Date(item.created_at).toLocaleDateString('de-DE')}
              </Text>
            </CardContent>
          </Card>
        )}
      />
    </View>
  );
}
