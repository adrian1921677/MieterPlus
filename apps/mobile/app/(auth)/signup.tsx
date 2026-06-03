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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, type SignUpInput } from '@mieterplus/shared';
import { supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { role: 'tenant' },
  });

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
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="mb-4 text-center text-2xl font-bold">E-Mail bestätigen</Text>
        <Text className="text-center text-gray-600">
          Wir haben dir einen Bestätigungslink an deine E-Mail-Adresse geschickt. Bitte öffne
          ihn, um dein Konto zu aktivieren.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerClassName="flex-grow px-6 py-8">
        <Text className="mb-6 text-2xl font-bold text-gray-900">Mieter-Konto erstellen</Text>

        <View className="space-y-4">
          <Field
            label="Vollständiger Name"
            error={errors.full_name?.message}
            control={control}
            name="full_name"
            autoComplete="name"
          />
          <Field
            label="E-Mail"
            error={errors.email?.message}
            control={control}
            name="email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
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
            <View className="rounded-lg bg-red-50 p-3">
              <Text className="text-sm text-red-700">{serverError}</Text>
            </View>
          )}

          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="rounded-lg bg-primary py-4 active:bg-primary-dark disabled:opacity-50"
          >
            <Text className="text-center text-base font-semibold text-white">
              {isSubmitting ? 'Wird erstellt…' : 'Konto erstellen'}
            </Text>
          </Pressable>

          <Text className="text-center text-xs text-gray-500">
            Vermieter-Konten werden über das Web-Dashboard angelegt.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  // deno-lint-ignore no-explicit-any
  control: any;
  name: 'full_name' | 'email' | 'password';
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View>
      <Text className="mb-2 text-sm font-medium text-gray-700">{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <TextInput
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-base"
            value={value ?? ''}
            onChangeText={onChange}
            {...inputProps}
          />
        )}
      />
      {hint && <Text className="mt-1 text-xs text-gray-500">{hint}</Text>}
      {error && <Text className="mt-1 text-sm text-red-600">{error}</Text>}
    </View>
  );
}
