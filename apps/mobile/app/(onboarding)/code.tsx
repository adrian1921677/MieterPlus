import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { TENANT_INVITATION_CODE_LENGTH } from '@mieterplus/shared';

export default function CodeScreen() {
  const { refresh } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const isComplete = normalized.length === TENANT_INVITATION_CODE_LENGTH;

  const onSubmit = async () => {
    if (!isComplete) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) throw new Error('Nicht angemeldet');
      const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/verify-tenant-code`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sess.session.access_token}`,
        },
        body: JSON.stringify({ code: normalized }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error?.message ?? 'Code-Prüfung fehlgeschlagen');
        return;
      }
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerClassName="flex-grow px-6 py-6">
        <Text className="mb-2 text-2xl font-bold text-gray-900">Dein Einladungscode</Text>
        <Text className="mb-6 text-gray-600">
          Gib den {TENANT_INVITATION_CODE_LENGTH}-stelligen Code ein, den dein Vermieter dir
          gegeben hat. Damit verifizieren wir, dass du in dieser Wohnung wohnst.
        </Text>

        <TextInput
          className="rounded-lg border-2 border-gray-300 px-4 py-4 text-center font-mono text-2xl tracking-widest"
          value={normalized}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={TENANT_INVITATION_CODE_LENGTH}
          placeholder="ABCDE12345FG"
        />

        <Text className="mt-2 text-center text-xs text-gray-500">
          {normalized.length} / {TENANT_INVITATION_CODE_LENGTH} Zeichen
        </Text>

        {error && (
          <View className="mt-4 rounded-lg bg-red-50 p-3">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        )}

        <Pressable
          onPress={onSubmit}
          disabled={!isComplete || submitting}
          className="mt-6 rounded-lg bg-primary py-4 active:bg-primary-dark disabled:opacity-50"
        >
          <Text className="text-center text-base font-semibold text-white">
            {submitting ? 'Wird geprüft…' : 'Code einlösen'}
          </Text>
        </Pressable>

        <Text className="mt-6 text-center text-xs text-gray-500">
          Noch keinen Code? Frage deinen Vermieter — er kann ihn in MieterPlus für deine
          Wohnung generieren.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
