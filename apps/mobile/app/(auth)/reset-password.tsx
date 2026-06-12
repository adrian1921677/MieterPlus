import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
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

const resetSchema = z
  .object({
    password: z
      .string()
      .min(10, 'Passwort muss mindestens 10 Zeichen lang sein')
      .refine((v) => /[A-Z]/.test(v), 'Mindestens ein Großbuchstabe')
      .refine((v) => /[a-z]/.test(v), 'Mindestens ein Kleinbuchstabe')
      .refine((v) => /[0-9]/.test(v), 'Mindestens eine Ziffer'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirm'],
  });

type ResetInput = z.infer<typeof resetSchema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; access_token?: string }>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [exchanging, setExchanging] = useState(true);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetInput>({ resolver: zodResolver(resetSchema) });

  useEffect(() => {
    void (async () => {
      try {
        if (typeof params.code === 'string') {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) setServerError(error.message);
        }
      } finally {
        setExchanging(false);
      }
    })();
  }, [params.code]);

  const onSubmit = async (values: ResetInput) => {
    setServerError(null);
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      setServerError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.replace('/(auth)/login'), 1500);
  };

  return (
    <View className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="px-4 pt-16 pb-12">
          <View className="mb-6 items-center">
            <Brand variant="centered" />
          </View>

          <Card>
            <CardHeader className="gap-2">
              <CardTitle className="text-2xl">Neues Passwort</CardTitle>
              <CardDescription>
                {exchanging
                  ? 'Reset-Link wird überprüft…'
                  : 'Wähle ein neues sicheres Passwort.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {done ? (
                <View className="items-center gap-3 py-4">
                  <Text className="text-base font-medium text-foreground">
                    Passwort geändert ✓
                  </Text>
                  <Text className="text-sm text-muted-foreground">Du wirst weitergeleitet…</Text>
                </View>
              ) : (
                <View className="gap-4">
                  <View className="gap-2">
                    <Label>Neues Passwort</Label>
                    <Controller
                      control={control}
                      name="password"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          value={value ?? ''}
                          onChangeText={onChange}
                          secureTextEntry
                          autoComplete="new-password"
                          hasError={!!errors.password}
                        />
                      )}
                    />
                    {errors.password && (
                      <Text className="text-sm text-destructive">{errors.password.message}</Text>
                    )}
                  </View>

                  <View className="gap-2">
                    <Label>Bestätigen</Label>
                    <Controller
                      control={control}
                      name="confirm"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          value={value ?? ''}
                          onChangeText={onChange}
                          secureTextEntry
                          autoComplete="new-password"
                          hasError={!!errors.confirm}
                        />
                      )}
                    />
                    {errors.confirm && (
                      <Text className="text-sm text-destructive">{errors.confirm.message}</Text>
                    )}
                  </View>

                  {serverError && (
                    <View className="rounded-md bg-destructive/10 p-3">
                      <Text className="text-sm text-destructive">{serverError}</Text>
                    </View>
                  )}

                  <Button
                    fullWidth
                    loading={isSubmitting}
                    disabled={exchanging}
                    onPress={handleSubmit(onSubmit)}
                  >
                    {isSubmitting ? 'Wird gespeichert…' : 'Passwort setzen'}
                  </Button>
                </View>
              )}
            </CardContent>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
