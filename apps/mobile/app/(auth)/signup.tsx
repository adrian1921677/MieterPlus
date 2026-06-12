import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, type SignUpInput } from '@mieterplus/shared';
import { supabase } from '@/lib/supabase';
import { signInWithGoogle } from '@/lib/google-auth';
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
import { GoogleButton } from '@/components/ui/google-button';
import { RolePicker, type Role } from '@/components/role-picker';

export default function SignupScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleRole, setGoogleRole] = useState<Role>('tenant');

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { role: 'tenant' },
  });

  const emailRole = watch('role') as Role;

  const handleGoogle = async () => {
    setServerError(null);
    setGoogleLoading(true);
    const result = await signInWithGoogle(googleRole);
    setGoogleLoading(false);
    if (!result.ok && result.reason !== 'cancelled') {
      setServerError(result.message ?? 'Google-Anmeldung fehlgeschlagen');
    }
  };

  const onSubmit = async (values: SignUpInput) => {
    setServerError(null);
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.full_name, role: values.role } },
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    if (data.user && !data.session) {
      setConfirmationSent(true);
    }
  };

  if (confirmationSent) {
    return (
      <View className="flex-1 bg-slate-50 px-4 pt-12">
        <View className="mb-8 items-center">
          <Brand variant="centered" />
        </View>
        <Card>
          <CardHeader className="gap-2">
            <CardTitle className="text-2xl">E-Mail bestätigen</CardTitle>
            <CardDescription>
              Wir haben dir einen Bestätigungslink geschickt. Bitte öffne ihn, um dein Konto zu
              aktivieren — danach kannst du dich anmelden.
            </CardDescription>
          </CardHeader>
        </Card>
      </View>
    );
  }

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
              <CardTitle className="text-2xl">Konto erstellen</CardTitle>
              <CardDescription>
                Wähle deine Rolle und melde dich mit Google an — oder registriere dich
                klassisch per E-Mail.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <View className="gap-5">
                {/* Google-Section: Rolle + Google-Button */}
                <View className="gap-3">
                  <RolePicker value={googleRole} onChange={setGoogleRole} />
                  <GoogleButton
                    onPress={handleGoogle}
                    loading={googleLoading}
                    disabled={isSubmitting}
                    label={
                      googleRole === 'landlord'
                        ? 'Als Vermieter mit Google'
                        : 'Als Mieter mit Google'
                    }
                  />
                </View>

                {/* Trenner */}
                <View className="flex-row items-center gap-3">
                  <View className="h-px flex-1 bg-border" />
                  <Text className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    oder per E-Mail
                  </Text>
                  <View className="h-px flex-1 bg-border" />
                </View>

                {/* Email-Form mit Rolle-Wiederwahl */}
                <View className="gap-4">
                  <RolePicker
                    value={emailRole}
                    onChange={(r) => setValue('role', r)}
                  />

                  <Field
                    label="Vollständiger Name"
                    error={errors.full_name?.message}
                    control={control}
                    name="full_name"
                    autoComplete="name"
                    placeholder="Max Mustermann"
                  />
                  <Field
                    label="E-Mail"
                    error={errors.email?.message}
                    control={control}
                    name="email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    placeholder="du@beispiel.de"
                  />
                  <Field
                    label="Passwort"
                    error={errors.password?.message}
                    hint="Min. 10 Zeichen, mit Groß-/Kleinbuchstaben und Ziffer"
                    control={control}
                    name="password"
                    secureTextEntry
                    autoComplete="new-password"
                  />

                  {serverError && (
                    <View className="rounded-md bg-destructive/10 p-3">
                      <Text className="text-sm text-destructive">{serverError}</Text>
                    </View>
                  )}

                  <Button fullWidth loading={isSubmitting} onPress={handleSubmit(onSubmit)}>
                    {isSubmitting ? 'Wird erstellt…' : 'Konto erstellen'}
                  </Button>
                </View>

                <View className="flex-row justify-center">
                  <Text className="text-sm text-muted-foreground">Schon ein Konto? </Text>
                  <Link href="/(auth)/login" asChild>
                    <Pressable>
                      <Text className="text-sm font-medium text-primary">Anmelden</Text>
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

function Field({
  label,
  error,
  hint,
  control,
  name,
  ...inputProps
}: {
  label: string;
  error?: string;
  hint?: string;
  control: Control<SignUpInput>;
  name: 'full_name' | 'email' | 'password';
} & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChangeText'>) {
  return (
    <View className="gap-2">
      <Label>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <Input
            value={(value as string) ?? ''}
            onChangeText={onChange}
            hasError={!!error}
            {...inputProps}
          />
        )}
      />
      {hint && <Text className="text-xs text-muted-foreground">{hint}</Text>}
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}
