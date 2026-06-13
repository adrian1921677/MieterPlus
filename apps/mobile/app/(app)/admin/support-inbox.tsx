import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Thread = {
  user_id: string;
  user_name: string;
  last_body: string;
  last_at: string;
  unread: number;
};

/** Admin-Support-Postfach: alle Threads — Web-Pendant /dashboard/admin/support. */
export default function SupportInboxScreen() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('support_messages')
      .select('thread_user_id, body, from_admin, read_at, created_at, profiles:thread_user_id(full_name)')
      .order('created_at', { ascending: false })
      .limit(500);

    const byThread = new Map<string, Thread>();
    for (const m of data ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mm: any = m;
      const uid = mm.thread_user_id as string;
      if (!byThread.has(uid)) {
        byThread.set(uid, {
          user_id: uid,
          user_name: mm.profiles?.full_name ?? 'Unbekannt',
          last_body: mm.body,
          last_at: mm.created_at,
          unread: 0,
        });
      }
      if (!mm.from_admin && !mm.read_at) {
        const t = byThread.get(uid)!;
        t.unread += 1;
      }
    }
    setThreads(Array.from(byThread.values()));
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
        data={threads}
        keyExtractor={(t) => t.user_id}
        contentContainerClassName="p-4 gap-3"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View className="mb-2">
            <Pressable onPress={() => router.back()} className="mb-3 flex-row items-center gap-2">
              <Ionicons name="chevron-back" size={18} color="#2563eb" />
              <Text className="text-sm font-medium text-primary">Zurück</Text>
            </Pressable>
            <Text className="text-2xl font-bold text-foreground">Support-Postfach</Text>
            <Text className="text-sm text-muted-foreground">
              {threads.length} Konversation(en)
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <Card>
              <CardContent className="items-center gap-3 py-12">
                <Ionicons name="mail-open-outline" size={48} color="#94a3b8" />
                <Text className="text-lg font-semibold text-foreground">Posteingang leer</Text>
                <Text className="text-center text-sm text-muted-foreground">
                  Support-Anfragen von Nutzern erscheinen hier.
                </Text>
              </CardContent>
            </Card>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(app)/admin/support-thread/[userId]',
                params: { userId: item.user_id },
              })
            }
          >
            <Card>
              <CardContent className="flex-row items-center gap-3 p-4">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Text className="text-base font-bold text-primary">
                    {item.user_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">{item.user_name}</Text>
                  <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                    {item.last_body}
                  </Text>
                </View>
                <View className="items-end gap-1">
                  <Text className="text-[10px] text-muted-foreground">
                    {new Date(item.last_at).toLocaleDateString('de-DE')}
                  </Text>
                  {item.unread > 0 && <Badge variant="destructive">{item.unread}</Badge>}
                </View>
              </CardContent>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
