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
import { STORAGE_BUCKETS, type OwnershipDocumentType } from '@mieterplus/shared';
import { supabase } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
  owner_name: string;
};

type Doc = {
  id: string;
  file_path: string;
  document_type: OwnershipDocumentType;
  signedUrl?: string;
  isImage: boolean;
};

export default function PropertyReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const { data: p } = await supabase
      .from('properties')
      .select(
        'id, street, house_number, postal_code, city, ownership_status, rejection_reason, owner_id, profiles:owner_id(full_name)',
      )
      .eq('id', id)
      .single();
    if (p) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pp: any = p;
      setProperty({
        id: pp.id,
        street: pp.street,
        house_number: pp.house_number,
        postal_code: pp.postal_code,
        city: pp.city,
        ownership_status: pp.ownership_status,
        rejection_reason: pp.rejection_reason,
        owner_id: pp.owner_id,
        owner_name: pp.profiles?.full_name ?? 'Unbekannt',
      });
    }

    const { data: d } = await supabase
      .from('ownership_documents')
      .select('id, file_path, document_type')
      .eq('property_id', id)
      .order('created_at');

    const items: Doc[] = await Promise.all(
      (d ?? []).map(async (doc) => {
        const { data: signed } = await supabase.storage
          .from(STORAGE_BUCKETS.ownershipDocuments)
          .createSignedUrl(doc.file_path, 600);
        return {
          id: doc.id,
          file_path: doc.file_path,
          document_type: doc.document_type as OwnershipDocumentType,
          signedUrl: signed?.signedUrl,
          isImage: !doc.file_path.toLowerCase().endsWith('.pdf'),
        };
      }),
    );
    setDocs(items);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (decision: 'verified' | 'rejected') => {
    if (!property) return;
    if (decision === 'rejected' && reason.trim().length < 5) {
      Alert.alert('Begründung erforderlich', 'Bitte gib eine kurze Begründung (min. 5 Zeichen).');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc('admin_review_property', {
      p_property_id: property.id,
      p_decision: decision,
      p_reason: decision === 'rejected' ? reason.trim() : null,
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Fehler', error.message);
      return;
    }
    Alert.alert(
      decision === 'verified' ? 'Freigegeben' : 'Abgelehnt',
      `Immobilie ${property.street} ${property.house_number} wurde ${
        decision === 'verified' ? 'freigegeben' : 'abgelehnt'
      }.`,
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
  if (!property) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-6">
        <Text className="text-foreground">Immobilie nicht gefunden.</Text>
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
        <Text className="text-2xl font-bold text-foreground">
          {property.street} {property.house_number}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {property.postal_code} {property.city}
        </Text>
      </View>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="text-base">Antragsteller</CardTitle>
          <CardDescription>{property.owner_name}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="text-base">Eigentumsnachweise</CardTitle>
          <CardDescription>
            {docs.length} Dokument(e) · tippe für Großansicht
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
                  {d.isImage && d.signedUrl ? (
                    <Image
                      source={{ uri: d.signedUrl }}
                      style={{ width: '100%', height: 220 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="flex-row items-center gap-3 p-4">
                      <Ionicons name="document-text-outline" size={24} color="#64748b" />
                      <Text className="flex-1 text-sm">PDF öffnen</Text>
                      <Ionicons name="open-outline" size={16} color="#2563eb" />
                    </View>
                  )}
                  <View className="p-3">
                    <Text className="text-xs font-medium text-foreground">
                      {DOC_LABELS[d.document_type]}
                    </Text>
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
              Alert.alert('Freigeben?', 'Die Immobilie wird als verifiziert markiert.', [
                { text: 'Abbrechen', style: 'cancel' },
                { text: 'Freigeben', onPress: () => decide('verified') },
              ])
            }
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="checkmark-circle-outline" size={18} color="white" />
              <Text className="text-base font-semibold text-primary-foreground">Freigeben</Text>
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
              Wird dem Vermieter angezeigt. Sei sachlich und konkret.
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <TextInput
              value={reason}
              onChangeText={setReason}
              multiline
              placeholder="z. B. „Grundbuchauszug nicht aktuell — bitte aktuelle Version (max. 3 Monate alt) hochladen."
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
