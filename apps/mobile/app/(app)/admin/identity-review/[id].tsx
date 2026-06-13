import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const BUCKET = 'identity-documents';

type Doc = {
  id: string;
  document_side: 'front' | 'back';
  file_path: string;
  signedUrl?: string;
};

type Target = {
  id: string;
  full_name: string;
  role: string;
  identity_verified_at: string | null;
};

export default function IdentityReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [target, setTarget] = useState<Target | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const { data: p } = await supabase
      .from('profiles')
      .select('id, full_name, role, identity_verified_at')
      .eq('id', id)
      .single();
    setTarget(p as Target | null);

    const { data: d } = await supabase
      .from('identity_documents')
      .select('id, document_side, file_path')
      .eq('user_id', id);
    const items: Doc[] = await Promise.all(
      (d ?? []).map(async (doc) => {
        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(doc.file_path, 600);
        return {
          id: doc.id,
          document_side: doc.document_side as 'front' | 'back',
          file_path: doc.file_path,
          signedUrl: signed?.signedUrl,
        };
      }),
    );
    setDocs(items.sort((a, b) => (a.document_side === 'front' ? -1 : 1)));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (decision: 'verified' | 'rejected') => {
    if (!target) return;
    if (decision === 'rejected' && reason.trim().length < 5) {
      Alert.alert('Begründung erforderlich', 'Bitte gib eine kurze Begründung (min. 5 Zeichen).');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc('admin_review_identity', {
      p_user_id: target.id,
      p_decision: decision,
      p_reason: decision === 'rejected' ? reason.trim() : null,
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Fehler', error.message);
      return;
    }
    Alert.alert(
      decision === 'verified' ? 'Identität bestätigt' : 'Identität abgelehnt',
      `${target.full_name} wurde ${decision === 'verified' ? 'verifiziert' : 'abgelehnt'}.`,
    );
    router.back();
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }
  if (!target) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-6">
        <Text className="text-foreground">User nicht gefunden.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="p-4 gap-4 pb-12">
      <Pressable onPress={() => router.back()} className="flex-row items-center gap-2">
        <Ionicons name="chevron-back" size={18} color="#2563eb" />
        <Text className="text-sm font-medium text-primary">Zurück</Text>
      </Pressable>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle>{target.full_name}</CardTitle>
          <CardDescription>
            Rolle: {target.role === 'landlord' ? 'Vermieter' : target.role} ·{' '}
            {target.identity_verified_at ? 'bereits verifiziert' : 'wartet auf Prüfung'}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="text-base">Personalausweis</CardTitle>
          <CardDescription>
            Prüfe, ob der Name auf dem Ausweis mit dem Profil-Namen übereinstimmt und die
            Dokumente lesbar &amp; aktuell sind.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <Text className="text-sm text-muted-foreground">
              Keine Dokumente hochgeladen — Ablehnung empfohlen.
            </Text>
          ) : (
            <View className="gap-3">
              {docs.map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => d.signedUrl && Linking.openURL(d.signedUrl)}
                  className="overflow-hidden rounded-md border border-border bg-card"
                >
                  {d.signedUrl ? (
                    <Image
                      source={{ uri: d.signedUrl }}
                      style={{ width: '100%', height: 240 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-40 items-center justify-center bg-muted">
                      <ActivityIndicator color="#64748b" />
                    </View>
                  )}
                  <View className="flex-row items-center justify-between p-3">
                    <Text className="text-xs font-medium uppercase tracking-wider text-foreground">
                      {d.document_side === 'front' ? 'Vorderseite' : 'Rückseite'}
                    </Text>
                    <Ionicons name="expand-outline" size={14} color="#64748b" />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </CardContent>
      </Card>

      {!showReject ? (
        <View className="gap-2">
          <Button
            fullWidth
            loading={submitting}
            onPress={() =>
              Alert.alert(
                'Identität bestätigen?',
                `${target.full_name} wird als verifiziert markiert.`,
                [
                  { text: 'Abbrechen', style: 'cancel' },
                  { text: 'Bestätigen', onPress: () => decide('verified') },
                ],
              )
            }
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="finger-print-outline" size={18} color="white" />
              <Text className="text-base font-semibold text-primary-foreground">
                Identität bestätigen
              </Text>
            </View>
          </Button>
          <Button fullWidth variant="outline" onPress={() => setShowReject(true)}>
            <View className="flex-row items-center gap-2">
              <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
              <Text className="text-sm font-medium text-destructive">Ablehnen</Text>
            </View>
          </Button>
        </View>
      ) : (
        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="text-base">Ablehnungsgrund</CardTitle>
            <CardDescription>
              Wird dem Vermieter angezeigt — bitte konkret und sachlich.
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <TextInput
              value={reason}
              onChangeText={setReason}
              multiline
              placeholder="z. B. „Personalausweis abgelaufen — bitte aktuellen Ausweis nutzen."
              className="min-h-[120px] rounded-md border border-input bg-background p-3 text-sm text-foreground"
            />
            <View className="flex-row gap-2">
              <Button
                variant="destructive"
                onPress={() => decide('rejected')}
                loading={submitting}
              >
                Endgültig ablehnen
              </Button>
              <Button variant="outline" onPress={() => setShowReject(false)}>
                Abbrechen
              </Button>
            </View>
          </CardContent>
        </Card>
      )}
    </ScrollView>
  );
}
