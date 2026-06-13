import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_LABELS_DE } from '@mieterplus/shared';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

  const [editing, setEditing] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);

  const setPlan = async (plan: string) => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.rpc('admin_set_subscription', {
      p_user_id: editing.id,
      p_plan: plan,
      p_months: 12,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Fehler', error.message);
      return;
    }
    setEditing(null);
    await load();
  };

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
          <Pressable onPress={() => item.role !== 'admin' && setEditing(item)}>
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
                  {item.subscription_plan && item.role === 'landlord' && (
                    <Badge
                      variant={item.subscription_plan === 'trial' ? 'warning' : 'info'}
                    >
                      {SUBSCRIPTION_PLAN_LABELS_DE[
                        item.subscription_plan as keyof typeof SUBSCRIPTION_PLAN_LABELS_DE
                      ] ?? item.subscription_plan}
                    </Badge>
                  )}
                </View>
              </View>
              <Text className="text-[10px] text-muted-foreground">
                {new Date(item.created_at).toLocaleDateString('de-DE')}
              </Text>
            </CardContent>
          </Card>
          </Pressable>
        )}
      />

      <Modal
        visible={!!editing}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <Pressable onPress={() => setEditing(null)} className="flex-1 bg-black/40">
          <Pressable onPress={(e) => e.stopPropagation()} className="mt-auto">
            <View className="rounded-t-2xl bg-white p-5 pb-10">
              <View className="mb-3 self-center h-1 w-12 rounded-full bg-muted" />
              <Text className="mb-1 text-xl font-bold text-foreground">
                Tarif setzen
              </Text>
              <Text className="mb-4 text-sm text-muted-foreground">
                {editing?.full_name} · {editing?.role}
              </Text>
              <View className="gap-2">
                {SUBSCRIPTION_PLANS.map((p) => (
                  <Button
                    key={p}
                    fullWidth
                    variant={editing?.subscription_plan === p ? 'default' : 'outline'}
                    loading={saving}
                    onPress={() => setPlan(p)}
                  >
                    {SUBSCRIPTION_PLAN_LABELS_DE[p]}
                  </Button>
                ))}
                <Button fullWidth variant="ghost" onPress={() => setEditing(null)}>
                  Abbrechen
                </Button>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
