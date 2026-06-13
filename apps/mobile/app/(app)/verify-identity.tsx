import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VerifiedBadge } from '@/components/ui/verified-badge';

const BUCKET = 'identity-documents';

type DocRow = {
  id: string;
  document_side: 'front' | 'back';
  file_path: string;
  uploaded_at: string;
  signedUrl?: string;
};

/** Identitäts-Verifikation (Vermieter) — 1:1 wie Web /dashboard/verify-identity. */
export default function VerifyIdentityScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingSide, setUploadingSide] = useState<'front' | 'back' | null>(null);

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data: me } = await supabase
      .from('profiles')
      .select('identity_verified_at, identity_rejection_reason')
      .eq('id', session.user.id)
      .single();
    setVerifiedAt(me?.identity_verified_at ?? null);
    setRejectionReason(me?.identity_rejection_reason ?? null);

    const { data: d } = await supabase
      .from('identity_documents')
      .select('id, document_side, file_path, uploaded_at')
      .eq('user_id', session.user.id);

    const items: DocRow[] = await Promise.all(
      (d ?? []).map(async (doc) => {
        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(doc.file_path, 300);
        return {
          id: doc.id,
          document_side: doc.document_side as 'front' | 'back',
          file_path: doc.file_path,
          uploaded_at: doc.uploaded_at,
          signedUrl: signed?.signedUrl,
        };
      }),
    );
    setDocs(items);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (side: 'front' | 'back') => {
    if (!session?.user?.id) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Berechtigung fehlt', 'Bitte erlaube Foto-Zugriff in den Einstellungen.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      Alert.alert('Zu groß', 'Maximal 10 MB pro Bild.');
      return;
    }

    setUploadingSide(side);
    try {
      // Vorhandene Seite löschen
      const existing = docs.find((d) => d.document_side === side);
      if (existing) {
        await supabase.storage.from(BUCKET).remove([existing.file_path]);
        await supabase.from('identity_documents').delete().eq('id', existing.id);
      }

      const ext = (asset.fileName ?? asset.uri.split('.').pop() ?? 'jpg').split('.').pop() ?? 'jpg';
      const path = `${session.user.id}/${side}-${Date.now()}.${ext}`;
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, {
          contentType: asset.mimeType ?? 'image/jpeg',
          upsert: false,
        });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from('identity_documents').insert({
        user_id: session.user.id,
        document_side: side,
        file_path: path,
        mime_type: asset.mimeType ?? 'image/jpeg',
      });
      if (dbErr) throw dbErr;

      // Falls vorher abgelehnt war: rejection_reason zurücksetzen
      if (rejectionReason) {
        await supabase
          .from('profiles')
          .update({ identity_rejection_reason: null })
          .eq('id', session.user.id);
      }

      await load();
    } catch (err: unknown) {
      Alert.alert('Fehler', err instanceof Error ? err.message : 'Upload fehlgeschlagen');
    } finally {
      setUploadingSide(null);
    }
  };

  const front = docs.find((d) => d.document_side === 'front');
  const back = docs.find((d) => d.document_side === 'back');

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="p-4 gap-4 pb-12">
      <Pressable onPress={() => router.back()} className="flex-row items-center gap-2">
        <Ionicons name="chevron-back" size={18} color="#2563eb" />
        <Text className="text-sm font-medium text-primary">Zurück</Text>
      </Pressable>

      <View>
        <Text className="text-2xl font-bold text-foreground">Identität verifizieren</Text>
        <Text className="text-sm text-muted-foreground">
          Bevor du Immobilien anlegen kannst, prüfen wir deinen Personalausweis.
        </Text>
      </View>

      {verifiedAt ? (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex-row items-center gap-3 p-4">
            <VerifiedBadge size={28} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">Identität bestätigt</Text>
              <Text className="text-xs text-muted-foreground">
                Bestätigt am {new Date(verifiedAt).toLocaleDateString('de-DE')}.
              </Text>
            </View>
          </CardContent>
        </Card>
      ) : (
        <>
          {rejectionReason ? (
            <Card className="border-destructive/40 bg-destructive/10">
              <CardHeader className="gap-1">
                <CardTitle className="text-sm text-destructive">Abgelehnt</CardTitle>
                <CardDescription className="text-destructive">
                  Grund: {rejectionReason}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : front && back ? (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-3">
                <Badge variant="warning">In Prüfung</Badge>
                <Text className="mt-2 text-xs text-amber-900">
                  Deine Dokumente werden geprüft. Du wirst per E-Mail informiert.
                </Text>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="text-base">Personalausweis hochladen</CardTitle>
          <CardDescription>
            Vorder- und Rückseite. Du darfst Seriennummer und Zugangsnummer schwärzen
            (§20 PAuswG).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <View className="gap-3">
            <Slot
              label="Vorderseite"
              doc={front}
              busy={uploadingSide === 'front'}
              canEdit={!verifiedAt}
              onPick={() => upload('front')}
            />
            <Slot
              label="Rückseite"
              doc={back}
              busy={uploadingSide === 'back'}
              canEdit={!verifiedAt}
              onPick={() => upload('back')}
            />
          </View>
        </CardContent>
      </Card>

      <View className="rounded-md border border-border bg-muted/30 p-3">
        <Text className="text-xs text-muted-foreground">
          <Text className="font-semibold text-foreground">Datenschutz:</Text> Bilder werden
          verschlüsselt gespeichert und 30 Tage nach erfolgreicher Verifikation automatisch
          gelöscht. Verwendung ausschließlich zur Identitätsprüfung.
        </Text>
      </View>
    </ScrollView>
  );
}

function Slot({
  label,
  doc,
  busy,
  canEdit,
  onPick,
}: {
  label: string;
  doc?: DocRow;
  busy: boolean;
  canEdit: boolean;
  onPick: () => void;
}) {
  return (
    <View className="rounded-md border border-border bg-card p-3">
      <Text className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Text>
      {doc?.signedUrl ? (
        <Image
          source={{ uri: doc.signedUrl }}
          style={{ width: '100%', height: 200 }}
          resizeMode="cover"
          className="rounded-md"
        />
      ) : (
        <View className="h-44 items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/30">
          <Ionicons name="id-card-outline" size={32} color="#94a3b8" />
          <Text className="mt-2 text-xs text-muted-foreground">Noch nichts hochgeladen</Text>
        </View>
      )}
      {canEdit && (
        <View className="mt-3">
          <Button fullWidth variant={doc ? 'outline' : 'default'} loading={busy} onPress={onPick}>
            <View className="flex-row items-center gap-2">
              <Ionicons
                name={doc ? 'refresh-outline' : 'cloud-upload-outline'}
                size={16}
                color={doc ? '#0f172a' : 'white'}
              />
              <Text
                className={`text-sm font-medium ${
                  doc ? 'text-foreground' : 'text-primary-foreground'
                }`}
              >
                {doc ? 'Ersetzen' : 'Hochladen'}
              </Text>
            </View>
          </Button>
        </View>
      )}
    </View>
  );
}
