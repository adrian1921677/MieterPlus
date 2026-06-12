import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { createPropertyInputSchema, type CreatePropertyInput } from '@mieterplus/shared';
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

export default function NewPropertyScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreatePropertyInput>({
    resolver: zodResolver(createPropertyInputSchema),
    defaultValues: { country: 'DE' },
  });

  const onSubmit = async (values: CreatePropertyInput) => {
    if (!session?.user?.id) return;
    setServerError(null);
    const { data, error } = await supabase
      .from('properties')
      .insert({ ...values, owner_id: session.user.id })
      .select('id')
      .single();
    if (error) {
      setServerError(error.message);
      return;
    }
    router.replace({ pathname: '/(app)/property/[id]', params: { id: data.id } });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-slate-50"
    >
      <Stack.Screen options={{ title: 'Neue Immobilie' }} />
      <ScrollView contentContainerClassName="p-4">
        <Pressable onPress={() => router.back()} className="mb-3 flex-row items-center gap-2">
          <Ionicons name="chevron-back" size={18} color="#2563eb" />
          <Text className="text-sm font-medium text-primary">Zurück</Text>
        </Pressable>

        <Card>
          <CardHeader className="gap-2">
            <CardTitle>Neue Immobilie</CardTitle>
            <CardDescription>
              Trage die Adresse ein. Im nächsten Schritt lädst du den Eigentumsnachweis hoch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <View className="gap-4">
              <View className="flex-row gap-3">
                <View className="flex-[2] gap-2">
                  <Label>Straße</Label>
                  <Controller
                    control={control}
                    name="street"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        value={value ?? ''}
                        onChangeText={onChange}
                        placeholder="Musterstraße"
                        hasError={!!errors.street}
                      />
                    )}
                  />
                  {errors.street && (
                    <Text className="text-xs text-destructive">{errors.street.message}</Text>
                  )}
                </View>
                <View className="flex-1 gap-2">
                  <Label>Nr.</Label>
                  <Controller
                    control={control}
                    name="house_number"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        value={value ?? ''}
                        onChangeText={onChange}
                        placeholder="12a"
                        hasError={!!errors.house_number}
                      />
                    )}
                  />
                  {errors.house_number && (
                    <Text className="text-xs text-destructive">
                      {errors.house_number.message}
                    </Text>
                  )}
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 gap-2">
                  <Label>PLZ</Label>
                  <Controller
                    control={control}
                    name="postal_code"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        value={value ?? ''}
                        onChangeText={onChange}
                        keyboardType="numeric"
                        maxLength={5}
                        placeholder="42281"
                        hasError={!!errors.postal_code}
                      />
                    )}
                  />
                  {errors.postal_code && (
                    <Text className="text-xs text-destructive">{errors.postal_code.message}</Text>
                  )}
                </View>
                <View className="flex-[2] gap-2">
                  <Label>Stadt</Label>
                  <Controller
                    control={control}
                    name="city"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        value={value ?? ''}
                        onChangeText={onChange}
                        placeholder="Wuppertal"
                        hasError={!!errors.city}
                      />
                    )}
                  />
                  {errors.city && (
                    <Text className="text-xs text-destructive">{errors.city.message}</Text>
                  )}
                </View>
              </View>

              {serverError && (
                <View className="rounded-md bg-destructive/10 p-3">
                  <Text className="text-sm text-destructive">{serverError}</Text>
                </View>
              )}

              <Button fullWidth loading={isSubmitting} onPress={handleSubmit(onSubmit)}>
                {isSubmitting ? 'Wird gespeichert…' : 'Weiter zu Dokumenten-Upload'}
              </Button>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
