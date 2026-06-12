import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { TENANT_INVITATION_CODE_LENGTH } from '@mieterplus/shared';
import { Brand } from '@/components/ui/brand';
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
      const { error: rpcErr } = await supabase.rpc('redeem_tenant_invitation', {
        p_code: normalized,
      });
      if (rpcErr) {
        const errCode = rpcErr.code ?? '';
        setError(ERROR_MESSAGES[errCode] ?? rpcErr.message ?? 'Code-Prüfung fehlgeschlagen');
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
    <View className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="px-4 pt-16 pb-8">
          <View className="mb-6 items-center">
            <Brand variant="centered" />
          </View>

          <Card>
            <CardHeader className="gap-2">
              <CardTitle className="text-2xl">Dein Einladungscode</CardTitle>
              <CardDescription>
                Gib den {TENANT_INVITATION_CODE_LENGTH}-stelligen Code ein, den dein Vermieter
                dir gegeben hat. Damit verifizieren wir, dass du in dieser Wohnung wohnst.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <View className="gap-4">
                <View className="gap-2">
                  <Label>Code</Label>
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

                <Button
                  fullWidth
                  loading={submitting}
                  disabled={!isComplete}
                  onPress={onSubmit}
                >
                  {submitting ? 'Wird geprüft…' : 'Code einlösen'}
                </Button>

                <Text className="text-center text-xs text-muted-foreground">
                  Noch keinen Code? Frage deinen Vermieter — er kann ihn in Mieter + für deine
                  Wohnung generieren.
                </Text>
              </View>
            </CardContent>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
