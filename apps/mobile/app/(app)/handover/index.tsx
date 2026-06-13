import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const WEB_URL =
  (Constants.expoConfig?.extra?.webApiUrl as string | undefined) ??
  'https://mieterplus.abdullahu.de';

type Protocol = {
  id: string;
  type: 'move_in' | 'move_out';
  status: string;
  created_at: string;
  tenant_name: string;
  address: string;
  pdf_ready: boolean;
};

/**
 * Übergabeprotokolle (Vermieter) — Web-Pendant /dashboard/handover.
 * Erstellen/Ausfüllen mit Fotos & Unterschriften bleibt im Web (komplexer
 * Editor); mobil: Übersicht + PDF öffnen + Weiterleitung zum Web-Editor.
 */
export default function HandoverListScreen() {
  const router = useRouter();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('handover_protocols')
      .select(
        'id, type, status, created_at, pdf_path, tenancies(profiles:tenant_id(full_name), units(unit_label, properties(street, house_number, city)))',
      )
      .order('created_at', { ascending: false });

    setProtocols(
      (data ?? []).map((p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pp: any = p;
        const t = pp.tenancies;
        const unit = t?.units;
        const prop = unit?.properties;
        return {
          id: pp.id,
          type: pp.type,
          status: pp.status,
          created_at: pp.created_at,
          tenant_name: t?.profiles?.full_name ?? '—',
          address: prop
            ? `${prop.street} ${prop.house_number}, ${prop.city} · ${unit?.unit_label ?? ''}`
            : '—',
          pdf_ready: !!pp.pdf_path,
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

  const openPdf = (id: string) => {
    void Linking.openURL(`${WEB_URL}/api/handover/${id}/pdf`);
  };

  const openWebEditor = (id?: string) => {
    void Linking.openURL(`${WEB_URL}/dashboard/handover${id ? `/${id}` : '/new'}`);
  };

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={protocols}
        keyExtractor={(p) => p.id}
        contentContainerClassName="p-4 gap-3"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View className="mb-2 gap-3">
            <Pressable onPress={() => router.back()} className="flex-row items-center gap-2">
              <Ionicons name="chevron-back" size={18} color="#2563eb" />
              <Text className="text-sm font-medium text-primary">Zurück</Text>
            </Pressable>
            <View className="flex-row items-end justify-between">
              <View>
                <Text className="text-2xl font-bold text-foreground">Übergabeprotokolle</Text>
                <Text className="text-sm text-muted-foreground">
                  {protocols.length} Protokoll(e)
                </Text>
              </View>
              <Pressable
                onPress={() => openWebEditor()}
                className="flex-row items-center gap-1 rounded-md bg-primary px-3 py-2"
              >
                <Ionicons name="add" size={16} color="white" />
                <Text className="text-sm font-medium text-white">Neu</Text>
              </Pressable>
            </View>
            <View className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <Text className="text-xs text-blue-900">
                Protokolle werden im Web-Editor ausgefüllt und unterschrieben — mit Fotos pro
                Raum, Zählerständen und digitaler Signatur. Hier siehst du den Status und
                öffnest fertige PDFs.
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <Card>
              <CardContent className="items-center gap-3 py-12">
                <Ionicons name="document-attach-outline" size={48} color="#94a3b8" />
                <Text className="text-lg font-semibold text-foreground">
                  Noch keine Protokolle
                </Text>
                <Text className="text-center text-sm text-muted-foreground">
                  Erstelle dein erstes Übergabeprotokoll für einen Ein- oder Auszug.
                </Text>
              </CardContent>
            </Card>
          )
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => (item.pdf_ready ? openPdf(item.id) : openWebEditor(item.id))}>
            <Card>
              <CardContent className="gap-2 p-4">
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">
                      {item.type === 'move_in' ? 'Einzug' : 'Auszug'} · {item.tenant_name}
                    </Text>
                    <Text className="text-xs text-muted-foreground">{item.address}</Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-[11px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString('de-DE')}
                  </Text>
                  <View className="flex-row items-center gap-1">
                    <Ionicons
                      name={item.pdf_ready ? 'document-outline' : 'create-outline'}
                      size={13}
                      color="#2563eb"
                    />
                    <Text className="text-xs font-medium text-primary">
                      {item.pdf_ready ? 'PDF öffnen' : 'Im Web bearbeiten'}
                    </Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <Badge variant="success">Abgeschlossen</Badge>;
  if (status === 'signed') return <Badge variant="info">Unterschrieben</Badge>;
  return <Badge variant="warning">Entwurf</Badge>;
}
