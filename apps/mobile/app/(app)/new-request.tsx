import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import {
  createRequestInputSchema,
  type CreateRequestInput,
  REQUEST_CATEGORIES,
  REQUEST_CATEGORY_LABELS_DE,
  REQUEST_PRIORITIES,
  REQUEST_PRIORITY_LABELS_DE,
  STORAGE_BUCKETS,
  MAX_ATTACHMENTS_PER_REQUEST,
} from '@mieterplus/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { compressImage } from '@/lib/compress-image';

type LocalAttachment = {
  uri: string;
  mimeType: string;
  fileName: string;
};

export default function NewRequestScreen() {
  const router = useRouter();
  const { tenancy, session } = useAuth();
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateRequestInput>({
    resolver: zodResolver(createRequestInputSchema),
    defaultValues: { priority: 'normal', category: 'other' },
  });

  const category = watch('category');
  const priority = watch('priority');

  const pickImages = async () => {
    if (attachments.length >= MAX_ATTACHMENTS_PER_REQUEST) {
      Alert.alert('Maximal erreicht', `Maximal ${MAX_ATTACHMENTS_PER_REQUEST} Fotos pro Mangel.`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
      selectionLimit: MAX_ATTACHMENTS_PER_REQUEST - attachments.length,
    });
    if (result.canceled) return;
    setProcessing(true);
    try {
      const fresh: LocalAttachment[] = [];
      for (const asset of result.assets) {
        // Vor dem Upload komprimieren (spart Storage, Daten & Zeit)
        fresh.push(await compressImage(asset.uri, asset.width));
      }
      setAttachments((prev) => [...prev, ...fresh].slice(0, MAX_ATTACHMENTS_PER_REQUEST));
    } catch {
      Alert.alert('Fehler', 'Bild konnte nicht verarbeitet werden.');
    } finally {
      setProcessing(false);
    }
  };

  const takePhoto = async () => {
    if (attachments.length >= MAX_ATTACHMENTS_PER_REQUEST) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Berechtigung fehlt', 'Bitte erlaube Kamera-Zugriff in den Einstellungen.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    setProcessing(true);
    try {
      const compressed = await compressImage(asset.uri, asset.width);
      setAttachments((prev) => [...prev, compressed].slice(0, MAX_ATTACHMENTS_PER_REQUEST));
    } catch {
      Alert.alert('Fehler', 'Foto konnte nicht verarbeitet werden.');
    } finally {
      setProcessing(false);
    }
  };

  const onSubmit = async (values: CreateRequestInput) => {
    if (!tenancy || !session?.user?.id) {
      setError('Nicht angemeldet oder kein Mietverhältnis aktiv.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const { data: request, error: insErr } = await supabase
        .from('requests')
        .insert({ ...values, tenancy_id: tenancy.id })
        .select('id')
        .single();
      if (insErr) throw insErr;

      for (const att of attachments) {
        const ext = att.fileName.split('.').pop() ?? 'jpg';
        const path = `${request.id}/${crypto.randomUUID()}.${ext}`;
        const base64 = await FileSystem.readAsStringAsync(att.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKETS.requestAttachments)
          .upload(path, bytes, { contentType: att.mimeType, upsert: false });
        if (upErr) throw upErr;
        await supabase.from('request_attachments').insert({
          request_id: request.id,
          file_path: path,
          mime_type: att.mimeType,
          uploaded_by: session.user.id,
        });
      }

      router.replace({ pathname: '/(app)/request/[id]', params: { id: request.id } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Senden fehlgeschlagen');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerClassName="p-6 pb-12">
        <Text className="mb-1 text-2xl font-bold">Mangel melden</Text>
        <Text className="mb-6 text-gray-600">
          Beschreibe den Mangel und füge Fotos hinzu — je genauer, desto schneller die Bearbeitung.
        </Text>

        <View className="space-y-5">
          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700">Kategorie</Text>
            <View className="flex-row flex-wrap gap-2">
              {REQUEST_CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setValue('category', c, { shouldValidate: true })}
                  className={`rounded-full border px-3 py-2 ${
                    category === c ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      category === c ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {REQUEST_CATEGORY_LABELS_DE[c]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700">Titel</Text>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="rounded-lg border border-gray-300 px-4 py-3 text-base"
                  value={value ?? ''}
                  onChangeText={onChange}
                  placeholder="z.B. Heizung im Schlafzimmer wird nicht warm"
                />
              )}
            />
            {errors.title && (
              <Text className="mt-1 text-xs text-red-600">{errors.title.message}</Text>
            )}
          </View>

          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700">Beschreibung</Text>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="min-h-[120px] rounded-lg border border-gray-300 px-4 py-3 text-base"
                  multiline
                  value={value ?? ''}
                  onChangeText={onChange}
                  placeholder="Was ist passiert? Seit wann? Was hast du schon versucht?"
                  textAlignVertical="top"
                />
              )}
            />
            {errors.description && (
              <Text className="mt-1 text-xs text-red-600">{errors.description.message}</Text>
            )}
          </View>

          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700">Priorität</Text>
            <View className="flex-row gap-2">
              {REQUEST_PRIORITIES.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setValue('priority', p, { shouldValidate: true })}
                  className={`flex-1 rounded-lg border py-2 ${
                    priority === p ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
                  }`}
                >
                  <Text
                    className={`text-center text-sm font-medium ${
                      priority === p ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {REQUEST_PRIORITY_LABELS_DE[p]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700">
              Fotos ({attachments.length} / {MAX_ATTACHMENTS_PER_REQUEST})
              {processing && <Text className="text-gray-400"> · wird verarbeitet…</Text>}
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {attachments.map((a, idx) => (
                <View key={idx} className="relative h-20 w-20">
                  <Image source={{ uri: a.uri }} className="h-full w-full rounded-lg" />
                  <Pressable
                    onPress={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute -right-1 -top-1 rounded-full bg-red-500 p-1"
                  >
                    <Ionicons name="close" size={12} color="white" />
                  </Pressable>
                </View>
              ))}
              {attachments.length < MAX_ATTACHMENTS_PER_REQUEST && (
                <>
                  <Pressable
                    onPress={takePhoto}
                    disabled={processing}
                    className="h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 disabled:opacity-50"
                  >
                    <Ionicons name="camera-outline" size={28} color="#6b7280" />
                  </Pressable>
                  <Pressable
                    onPress={pickImages}
                    disabled={processing}
                    className="h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 disabled:opacity-50"
                  >
                    <Ionicons name="images-outline" size={28} color="#6b7280" />
                  </Pressable>
                </>
              )}
            </View>
          </View>

          {error && (
            <View className="rounded-lg bg-red-50 p-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          )}

          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
            className="rounded-lg bg-primary py-4 active:bg-primary-dark disabled:opacity-50"
          >
            <Text className="text-center text-base font-semibold text-white">
              {submitting ? 'Wird gesendet…' : 'Mangel an Vermieter senden'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
