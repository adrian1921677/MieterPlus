import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import {
  STORAGE_BUCKETS,
  OWNERSHIP_DOCUMENT_TYPES,
  type OwnershipDocumentType,
} from '@mieterplus/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { VerifiedBadge } from '@/components/ui/verified-badge';

const DOC_LABELS: Record<OwnershipDocumentType, string> = {
  land_register: 'Grundbuchauszug',
  notary_deed: 'Notarurkunde',
  purchase_contract: 'Kaufvertrag',
  other: 'Sonstiges',
};

type Property = {
  id: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  ownership_status: string;
  rejection_reason: string | null;
  owner_id: string;
};

type Doc = {
  id: string;
  file_path: string;
  document_type: string;
  created_at: string;
};

type Unit = { id: string; unit_label: string };

type Invitation = {
  id: string;
  code: string;
  expires_at: string;
  used_at: string | null;
  unit_id: string;
};

export default function PropertyDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<OwnershipDocumentType>('land_register');
  const [newUnitLabel, setNewUnitLabel] = useState('');
  const [creatingUnit, setCreatingUnit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';
  const isOwner = property?.owner_id === session?.user?.id;
  const canEdit = property?.ownership_status === 'pending' && (isOwner || isAdmin);

  const load = useCallback(async () => {
    if (!id) return;
    const { data: p } = await supabase
      .from('properties')
      .select(
        'id, street, house_number, postal_code, city, ownership_status, rejection_reason, owner_id',
      )
      .eq('id', id)
      .single();
    setProperty(p as Property | null);

    const { data: d } = await supabase
      .from('ownership_documents')
      .select('id, file_path, document_type, created_at')
      .eq('property_id', id)
      .order('created_at', { ascending: false });
    setDocs((d ?? []) as Doc[]);

    const { data: u } = await supabase
      .from('units')
      .select('id, unit_label')
      .eq('property_id', id)
      .order('unit_label');
    setUnits((u ?? []) as Unit[]);

    if (u && u.length > 0) {
      const { data: inv } = await supabase
        .from('tenant_invitations')
        .select('id, code, expires_at, used_at, unit_id')
        .in(
          'unit_id',
          u.map((x) => x.id),
        )
        .order('created_at', { ascending: false });
      setInvitations((inv ?? []) as Invitation[]);
    }

    setLoading(false);
  }, [id]);

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

  const pickAndUpload = async () => {
    if (!property || !session?.user?.id) return;
    setError(null);
    Alert.alert('Datei wählen', 'Was willst du hochladen?', [
      { text: 'Foto aus Galerie', onPress: () => pickImage() },
      { text: 'PDF-Dokument', onPress: () => pickDocument() },
      { text: 'Abbrechen', style: 'cancel' },
    ]);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    await uploadFile(asset.uri, asset.mimeType ?? 'image/jpeg', asset.fileName ?? 'photo.jpg');
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    await uploadFile(asset.uri, asset.mimeType ?? 'application/pdf', asset.name);
  };

  const uploadFile = async (uri: string, mimeType: string, fileName: string) => {
    if (!property || !session?.user?.id) return;
    setUploading(true);
    try {
      const ext = fileName.split('.').pop() ?? 'bin';
      const path = `${property.id}/${crypto.randomUUID()}.${ext}`;
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKETS.ownershipDocuments)
        .upload(path, bytes, { contentType: mimeType, upsert: false });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from('ownership_documents').insert({
        property_id: property.id,
        file_path: path,
        document_type: docType,
        uploaded_by: session.user.id,
      });
      if (dbErr) throw dbErr;
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (doc: Doc) => {
    Alert.alert('Dokument löschen?', '', [
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          await supabase.storage
            .from(STORAGE_BUCKETS.ownershipDocuments)
            .remove([doc.file_path]);
          await supabase.from('ownership_documents').delete().eq('id', doc.id);
          await load();
        },
      },
      { text: 'Abbrechen', style: 'cancel' },
    ]);
  };

  const openDoc = async (doc: Doc) => {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKETS.ownershipDocuments)
      .createSignedUrl(doc.file_path, 300);
    if (data?.signedUrl) {
      void Linking.openURL(data.signedUrl);
    }
  };

  const addUnit = async () => {
    if (!property || !newUnitLabel.trim()) return;
    setCreatingUnit(true);
    setError(null);
    const { error: insErr } = await supabase
      .from('units')
      .insert({ property_id: property.id, unit_label: newUnitLabel.trim() });
    if (insErr) {
      setError(insErr.message);
    } else {
      setNewUnitLabel('');
      await load();
    }
    setCreatingUnit(false);
  };

  const generateCode = async (unitId: string) => {
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc('generate_invitation_code', {
      p_unit_id: unitId,
    });
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inv: any = data;
    setInvitations((prev) => [
      {
        id: inv.id,
        code: inv.code,
        expires_at: inv.expires_at,
        unit_id: inv.unit_id,
        used_at: null,
      },
      ...prev,
    ]);
  };

  const shareCode = async (code: string) => {
    if (!property) return;
    await Share.share({
      message: `Du wurdest zu Mieter + eingeladen!\n\nEinladungscode für ${property.street} ${property.house_number}:\n\n${code}\n\nLade die App "Mieter +" und gib den Code bei der Registrierung ein.`,
    });
  };

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Kopiert', 'Code in Zwischenablage');
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (!property) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-6">
        <Text className="text-foreground">Immobilie nicht gefunden.</Text>
        <Button className="mt-4" onPress={() => router.back()}>Zurück</Button>
      </View>
    );
  }

  const isVerified = property.ownership_status === 'verified';

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="p-4 gap-4"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Stack.Screen options={{ title: 'Immobilie' }} />
      <Pressable onPress={() => router.back()} className="flex-row items-center gap-2">
        <Ionicons name="chevron-back" size={18} color="#2563eb" />
        <Text className="text-sm font-medium text-primary">Zurück</Text>
      </Pressable>

      <View>
        <View className="flex-row items-center gap-2">
          <Text className="text-2xl font-bold text-foreground">
            {property.street} {property.house_number}
          </Text>
          {isVerified && <VerifiedBadge size={20} />}
        </View>
        <Text className="text-sm text-muted-foreground">
          {property.postal_code} {property.city}
        </Text>
      </View>

      {property.ownership_status === 'pending' && (
        <View className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <Text className="text-sm text-amber-900">
            Wartet auf Freigabe. Lade deinen Eigentumsnachweis hoch.
          </Text>
        </View>
      )}
      {property.ownership_status === 'rejected' && property.rejection_reason && (
        <View className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
          <Text className="text-sm text-destructive">
            <Text className="font-semibold">Abgelehnt:</Text> {property.rejection_reason}
          </Text>
        </View>
      )}

      {/* Eigentumsnachweise */}
      <Card>
        <CardHeader className="gap-2">
          <CardTitle>Eigentumsnachweise</CardTitle>
          <CardDescription>
            Grundbuchauszug, Notarurkunde oder Kaufvertrag. JPG, PNG oder PDF, max. 20 MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <View className="gap-3">
            {canEdit && (
              <>
                <View className="flex-row flex-wrap gap-2">
                  {OWNERSHIP_DOCUMENT_TYPES.map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setDocType(t)}
                      className={`rounded-full border px-3 py-1.5 ${
                        docType === t
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          docType === t ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {DOC_LABELS[t]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Button
                  fullWidth
                  variant="outline"
                  loading={uploading}
                  onPress={pickAndUpload}
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="cloud-upload-outline" size={18} color="#0f172a" />
                    <Text className="text-sm font-medium text-foreground">
                      {uploading ? 'Lädt hoch…' : 'Dokument hochladen'}
                    </Text>
                  </View>
                </Button>
              </>
            )}

            {error && (
              <View className="rounded-md bg-destructive/10 p-2">
                <Text className="text-xs text-destructive">{error}</Text>
              </View>
            )}

            {docs.length === 0 ? (
              <Text className="text-center text-sm text-muted-foreground">
                Noch keine Dokumente hochgeladen.
              </Text>
            ) : (
              <View className="gap-2">
                {docs.map((doc) => (
                  <View
                    key={doc.id}
                    className="flex-row items-center justify-between rounded-md border border-border bg-card p-3"
                  >
                    <Pressable
                      onPress={() => openDoc(doc)}
                      className="flex-1 flex-row items-center gap-3"
                    >
                      <Ionicons name="document-text-outline" size={18} color="#64748b" />
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-foreground">
                          {DOC_LABELS[doc.document_type as OwnershipDocumentType]}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString('de-DE')}
                        </Text>
                      </View>
                    </Pressable>
                    {canEdit && (
                      <Pressable onPress={() => deleteDoc(doc)} className="p-1">
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </CardContent>
      </Card>

      {/* Wohneinheiten + Codes (nur wenn verifiziert) */}
      {isVerified && isOwner && (
        <Card>
          <CardHeader className="gap-2">
            <CardTitle>Wohneinheiten</CardTitle>
            <CardDescription>
              Lege Einheiten an und generiere Einladungscodes für Mieter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <View className="gap-3">
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Input
                    value={newUnitLabel}
                    onChangeText={setNewUnitLabel}
                    placeholder='z.B. "WE 12, 3. OG links"'
                  />
                </View>
                <Button
                  onPress={addUnit}
                  loading={creatingUnit}
                  disabled={!newUnitLabel.trim()}
                >
                  Anlegen
                </Button>
              </View>

              {units.length === 0 ? (
                <Text className="text-center text-sm text-muted-foreground">
                  Noch keine Wohneinheiten.
                </Text>
              ) : (
                <View className="gap-2">
                  {units.map((unit) => {
                    const unitInvs = invitations.filter((i) => i.unit_id === unit.id);
                    const active = unitInvs.find(
                      (i) => !i.used_at && new Date(i.expires_at) > new Date(),
                    );
                    const claimed = unitInvs.find((i) => !!i.used_at);
                    return (
                      <View
                        key={unit.id}
                        className="rounded-md border border-border bg-card p-3"
                      >
                        <View className="flex-row items-start justify-between gap-2">
                          <View className="flex-1">
                            <Text className="text-sm font-medium text-foreground">
                              {unit.unit_label}
                            </Text>
                            <View className="mt-1 flex-row gap-2">
                              {claimed ? (
                                <Badge variant="success">Mieter registriert</Badge>
                              ) : active ? (
                                <Badge variant="info">Code aktiv</Badge>
                              ) : (
                                <Badge variant="outline">Kein Code</Badge>
                              )}
                            </View>
                          </View>
                          {!claimed && !active && (
                            <Button size="sm" onPress={() => generateCode(unit.id)}>
                              Code
                            </Button>
                          )}
                        </View>

                        {active && (
                          <View className="mt-3 rounded-md bg-blue-50 p-3">
                            <Text className="text-center font-mono text-lg font-bold tracking-widest text-primary">
                              {active.code}
                            </Text>
                            <View className="mt-2 flex-row gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onPress={() => copyCode(active.code)}
                              >
                                <View className="flex-row items-center gap-1">
                                  <Ionicons name="copy-outline" size={14} color="#0f172a" />
                                  <Text className="text-xs font-medium">Kopieren</Text>
                                </View>
                              </Button>
                              <Button
                                size="sm"
                                onPress={() => shareCode(active.code)}
                              >
                                <View className="flex-row items-center gap-1">
                                  <Ionicons name="share-outline" size={14} color="white" />
                                  <Text className="text-xs font-medium text-white">Teilen</Text>
                                </View>
                              </Button>
                            </View>
                            <Text className="mt-2 text-center text-[10px] text-muted-foreground">
                              gültig bis {new Date(active.expires_at).toLocaleDateString('de-DE')}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </CardContent>
        </Card>
      )}
    </ScrollView>
  );
}
