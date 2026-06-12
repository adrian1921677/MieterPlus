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
import * as Linking from 'expo-linking';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
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

const forgotSchema = z.object({
  email: z.string().email('Bitte eine gültige E-Mail-Adresse eingeben'),
});
type ForgotInput = z.infer<typeof forgotSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotInput>({ resolver: zodResolver(forgotSchema) });

  const onSubmit = async (values: ForgotInput) => {
    setServerError(null);
    // Reset-Link führt gezielt zur Web-Anwendung, damit der Nutzer dort sein Passwort ändern kann
    const redirectUrl = 'https://mieterplus.abdullahu.de/reset-password';
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: redirectUrl,
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    setSent(true);
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
            {sent ? (
              <>
                <CardHeader className="gap-2 items-center">
                  <View className="h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                    <Ionicons name="mail-outline" size={28} color="#2563eb" />
                  </View>
                  <CardTitle className="text-2xl">E-Mail unterwegs</CardTitle>
                  <CardDescription>
                    Falls für diese E-Mail-Adresse ein Konto existiert, haben wir dir einen
                    Link zum Zurücksetzen geschickt. Klicke auf den Link in der E-Mail, um 
                    dein Passwort im Browser neu zu vergeben.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button fullWidth variant="outline" onPress={() => router.replace('/(auth)/login')}>
                    Zurück zum Login
                  </Button>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader className="gap-2">
                  <CardTitle className="text-2xl">Passwort zurücksetzen</CardTitle>
                  <CardDescription>
                    Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link, mit dem du ein
                    neues Passwort vergeben kannst.
                  </CardDescription>
                </CardHeader>
                <CardContent>
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

                    {serverError && (
                      <View className="rounded-md bg-destructive/10 p-3">
                        <Text className="text-sm text-destructive">{serverError}</Text>
                      </View>
                    )}

                    <Button fullWidth loading={isSubmitting} onPress={handleSubmit(onSubmit)}>
                      {isSubmitting ? 'Wird gesendet…' : 'Reset-Link senden'}
                    </Button>

                    <View className="flex-row justify-center">
                      <Link href="/(auth)/login" asChild>
                        <Pressable>
                          <Text className="text-sm font-medium text-primary">
                            Zurück zum Login
                          </Text>
                        </Pressable>
                      </Link>
                    </View>
                  </View>
                </CardContent>
              </>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
