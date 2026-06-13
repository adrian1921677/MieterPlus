import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TENANT_INVITATION_CODE_LENGTH } from '@mieterplus/shared';
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
import { Label } from '@/components/ui/label';

const ERROR_MESSAGES: Record<string, string> = {
  P0001: 'Zu viele Versuche. Bitte in einer Stunde erneut versuchen.',
  P0002: 'Code ungültig.',
  P0003: 'Dieser Code wurde bereits eingelöst.',
  P0004: 'Code ist abgelaufen.',
  P0005: 'Du bist bereits Mieter dieser Wohnung.',
};

/**
 * Weitere Wohnung per Einladungscode hinzufügen — in-App-Pendant zu
 * Web /dashboard/join. Nutzt dieselbe RPC wie das Onboarding.
 */
export default function JoinScreen() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const isComplete = normalized.length === TENANT_INVITATION_CODE_LENGTH;

  const onSubmit = async () => {
    if (!isComplete) return;
    setSubmitting(true);
    setError(null);
    const { error: rpcErr } = await supabase.rpc('redeem_tenant_invitation', {
      p_code: normalized,
    });
    setSubmitting(false);
    if (rpcErr) {
      setError(ERROR_MESSAGES[rpcErr.code ?? ''] ?? rpcErr.message ?? 'Einlösen fehlgeschlagen');
      return;
    }
    setSuccess(true);
    await refresh();
  };

  if (success) {
    return (
      <View className="flex-1 bg-slate-50 p-4 pt-10">
        <Card>
          <CardHeader className="items-center gap-2">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <Ionicons name="checkmark-circle-outline" size={30} color="#16a34a" />
            </View>
            <CardTitle className="text-2xl">Wohnung hinzugefügt</CardTitle>
            <CardDescription>
              Du bist jetzt als Mieter dieser Wohnung registriert.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button fullWidth onPress={() => router.replace('/(app)/requests')}>
              Zur Übersicht
            </Button>
          </CardContent>
        </Card>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-slate-50"
    >
      <ScrollView contentContainerClassName="p-4 pt-6">
        <Pressable onPress={() => router.back()} className="mb-3 flex-row items-center gap-2">
          <Ionicons name="chevron-back" size={18} color="#2563eb" />
          <Text className="text-sm font-medium text-primary">Zurück</Text>
        </Pressable>

        <Card>
          <CardHeader className="gap-2">
            <CardTitle className="text-2xl">Wohnung hinzufügen</CardTitle>
            <CardDescription>
              Gib den {TENANT_INVITATION_CODE_LENGTH}-stelligen Einladungscode ein, den du von
              deinem Vermieter erhalten hast.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <View className="gap-4">
              <View className="gap-2">
                <Label>Einladungscode</Label>
                <Input
                  value={normalized}
                  onChangeText={setCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={TENANT_INVITATION_CODE_LENGTH}
                  placeholder="ABCDE12345FG"
                  className="h-14 text-center font-mono text-2xl tracking-widest"
                  hasError={!!error}
                />
                <Text className="text-center text-xs text-muted-foreground">
                  {normalized.length} / {TENANT_INVITATION_CODE_LENGTH} Zeichen
                </Text>
              </View>

              {error && (
                <View className="rounded-md bg-destructive/10 p-3">
                  <Text className="text-sm text-destructive">{error}</Text>
                </View>
              )}

              <Button fullWidth loading={submitting} disabled={!isComplete} onPress={onSubmit}>
                {submitting ? 'Wird geprüft…' : 'Code einlösen'}
              </Button>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
