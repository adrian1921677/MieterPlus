import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, type SignInInput } from '@mieterplus/shared';
import { supabase } from '@/lib/supabase';
import { signInWithGoogle } from '@/lib/google-auth';
import { Brand } from '@/components/ui/brand';
import { GoogleButton } from '@/components/ui/google-button';
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

export default function LoginScreen() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const handleGoogle = async () => {
    setServerError(null);
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);
    if (!result.ok && result.reason !== 'cancelled') {
      setServerError(result.message ?? 'Google-Anmeldung fehlgeschlagen');
    }
  };

  const onSubmit = async (values: SignInInput) => {
    setServerError(null);
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setServerError(
        error.message === 'Invalid login credentials'
          ? 'E-Mail oder Passwort ist falsch.'
          : error.message,
      );
    }
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
              <CardTitle className="text-2xl">Willkommen zurück</CardTitle>
              <CardDescription>
                Melde dich mit Google oder mit deiner E-Mail an.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <View className="gap-5">
                <GoogleButton
                  onPress={handleGoogle}
                  loading={googleLoading}
                  disabled={isSubmitting}
                />

                <View className="flex-row items-center gap-3">
                  <View className="h-px flex-1 bg-border" />
                  <Text className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    oder mit E-Mail
                  </Text>
                  <View className="h-px flex-1 bg-border" />
                </View>

                <View className="gap-4">
                  <View className="gap-2">
                    <Label>E-Mail</Label>
                    <Controller
                      control={control}
                      name="email"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          value={value ?? ''}
                          onChangeText={onChange}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoComplete="email"
                          textContentType="emailAddress"
                          placeholder="du@beispiel.de"
                          hasError={!!errors.email}
                        />
                      )}
                    />
                    {errors.email && (
                      <Text className="text-sm text-destructive">{errors.email.message}</Text>
                    )}
                  </View>

                  <View className="gap-2">
                    <View className="flex-row items-center justify-between">
                      <Label>Passwort</Label>
                      <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
                        <Text className="text-xs font-medium text-primary">
                          Passwort vergessen?
                        </Text>
                      </Pressable>
                    </View>
                    <Controller
                      control={control}
                      name="password"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          value={value ?? ''}
                          onChangeText={onChange}
                          secureTextEntry
                          autoComplete="current-password"
                          textContentType="password"
                          hasError={!!errors.password}
                        />
                      )}
                    />
                    {errors.password && (
                      <Text className="text-sm text-destructive">{errors.password.message}</Text>
                    )}
                  </View>

                  {serverError && (
                    <View className="rounded-md bg-destructive/10 p-3">
                      <Text className="text-sm text-destructive">{serverError}</Text>
                    </View>
                  )}

                  <Button fullWidth loading={isSubmitting} onPress={handleSubmit(onSubmit)}>
                    {isSubmitting ? 'Anmelden…' : 'Anmelden'}
                  </Button>
                </View>

                <View className="flex-row justify-center">
                  <Text className="text-sm text-muted-foreground">Noch kein Konto? </Text>
                  <Link href="/(auth)/signup" asChild>
                    <Pressable>
                      <Text className="text-sm font-medium text-primary">Jetzt registrieren</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            </CardContent>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
