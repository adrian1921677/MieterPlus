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
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, type SignInInput } from '@mieterplus/shared';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-12">
        <View className="mb-8 items-center">
          <View className="mb-3 rounded bg-primary px-3 py-1">
            <Text className="font-bold text-white">ADB</Text>
          </View>
          <Text className="text-3xl font-bold text-gray-900">Mieter +</Text>
          <Text className="mt-2 text-gray-500">Willkommen zurück</Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700">E-Mail</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-base"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  value={value ?? ''}
                  onChangeText={onChange}
                  placeholder="du@beispiel.de"
                />
              )}
            />
            {errors.email && (
              <Text className="mt-1 text-sm text-red-600">{errors.email.message}</Text>
            )}
          </View>

          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700">Passwort</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-base"
                  secureTextEntry
                  autoComplete="current-password"
                  textContentType="password"
                  value={value ?? ''}
                  onChangeText={onChange}
                />
              )}
            />
            {errors.password && (
              <Text className="mt-1 text-sm text-red-600">{errors.password.message}</Text>
            )}
          </View>

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
              {isSubmitting ? 'Anmelden…' : 'Anmelden'}
            </Text>
          </Pressable>

          <Link href="/(auth)/signup" asChild>
            <Pressable className="py-3">
              <Text className="text-center text-sm text-gray-600">
                Noch kein Konto?{' '}
                <Text className="font-medium text-primary">Jetzt registrieren</Text>
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
