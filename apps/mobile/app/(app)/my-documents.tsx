import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import {
  VAULT_DOCUMENT_TYPE_LABELS_DE,
  type VaultDocumentType,
} from '@mieterplus/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Doc = {
  id: string;
  type: VaultDocumentType;
  title: string;
  created_at: string;
  opened: boolean;
};

/**
 * Mieter-Sicht auf den Dokumenten-Tresor: nur freigegebene Dokumente
 * (visible_to_tenant) der eigenen Properties. 1:1 wie Web /dashboard/my-documents.
 */
export default function MyDocumentsScreen() {
  const { session } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    setError(null);

    // RLS filtert: Mieter sieht nur visible_to_tenant-Dokumente seiner Properties
    const { data, error: qErr } = await supabase
      .from('vault_documents')
      .select('id, type, title, created_at, document_access_log(viewer_id)')
      .eq('visible_to_tenant', true)
      .order('created_at', { ascending: false });

    if (qErr) {
      setError(qErr.message);
    } else {
      setDocs(
        (data ?? []).map((d) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dd: any = d;
          return {
            id: dd.id,
            type: dd.type,
            title: dd.title,
            created_at: dd.created_at,
            opened: (dd.document_access_log ?? []).some(
              (a: { viewer_id: string }) => a.viewer_id === session.user.id,
            ),
          };
        }),
      );
    }
    setLoading(false);
  }, [session?.user?.id]);

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

  const openDoc = async (doc: Doc) => {
    // Zugriff loggen (best-effort) + signierte URL öffnen
    if (session?.user?.id) {
      await supabase
        .from('document_access_log')
        .insert({ document_id: doc.id, viewer_id: session.user.id })
        .then(() => {}, () => {});
    }
    const { data } = await supabase.storage
      .from('vault')
      .createSignedUrl(`${await pathFor(doc.id)}`, 300);
    if (data?.signedUrl) void Linking.openURL(data.signedUrl);
  };

  // Pfad-Konvention aus Web: <property_id>/<doc_id> — property_id nachladen
  const pathFor = async (docId: string): Promise<string> => {
    const { data } = await supabase
      .from('vault_documents')
      .select('property_id')
      .eq('id', docId)
      .single();
    return `${data?.property_id}/${docId}`;
  };

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={docs}
        keyExtractor={(d) => d.id}
        contentContainerClassName="p-4 gap-3"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View className="mb-2">
            <Text className="text-2xl font-bold text-foreground">Meine Dokumente</Text>
            <Text className="text-sm text-muted-foreground">
              Dokumente, die dein Vermieter mit dir geteilt hat.
            </Text>
            {error && (
              <View className="mt-2 rounded-md bg-destructive/10 p-2">
                <Text className="text-xs text-destructive">{error}</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <Card>
              <CardContent className="items-center gap-3 py-12">
                <Ionicons name="folder-open-outline" size={48} color="#94a3b8" />
                <Text className="text-lg font-semibold text-foreground">Keine Dokumente</Text>
                <Text className="text-center text-sm text-muted-foreground">
                  Dein Vermieter hat bisher keine Dokumente für dich freigegeben.
                </Text>
              </CardContent>
            </Card>
          )
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => openDoc(item)}>
            <Card>
              <CardContent className="flex-row items-center gap-3 p-4">
                <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Ionicons name="document-text-outline" size={20} color="#2563eb" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View className="mt-1 flex-row items-center gap-2">
                    <Badge variant="outline">
                      {VAULT_DOCUMENT_TYPE_LABELS_DE[item.type] ?? item.type}
                    </Badge>
                    <Text className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString('de-DE')}
                    </Text>
                  </View>
                </View>
                {item.opened ? (
                  <Ionicons name="checkmark-done-outline" size={18} color="#16a34a" />
                ) : (
                  <Badge variant="info">Neu</Badge>
                )}
              </CardContent>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}
