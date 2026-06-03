import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { propertyAddressSchema, type PropertyAddress } from '@mieterplus/shared';

const STORAGE_KEY = 'mieterplus.onboarding.address';

export default function AddressScreen() {
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PropertyAddress>({
    resolver: zodResolver(propertyAddressSchema),
    defaultValues: { country: 'DE' },
  });

  const onNext = async (values: PropertyAddress) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      // best-effort persistence
    }
    router.push('/(onboarding)/code');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerClassName="flex-grow px-6 py-6">
        <Text className="mb-2 text-2xl font-bold text-gray-900">
          In welcher Wohnung wohnst du?
        </Text>
        <Text className="mb-6 text-gray-600">
          Trage die Adresse deiner Wohnung ein. Im nächsten Schritt gibst du den Code ein,
          den du von deinem Vermieter erhalten hast.
        </Text>

        <View className="space-y-4">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-2 text-sm font-medium text-gray-700">Straße</Text>
              <Controller
                control={control}
                name="street"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className="rounded-lg border border-gray-300 px-4 py-3 text-base"
                    value={value ?? ''}
                    onChangeText={onChange}
                  />
                )}
              />
              {errors.street && (
                <Text className="mt-1 text-xs text-red-600">{errors.street.message}</Text>
              )}
            </View>
            <View className="w-24">
              <Text className="mb-2 text-sm font-medium text-gray-700">Nr.</Text>
              <Controller
                control={control}
                name="house_number"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className="rounded-lg border border-gray-300 px-4 py-3 text-base"
                    value={value ?? ''}
                    onChangeText={onChange}
                  />
                )}
              />
              {errors.house_number && (
                <Text className="mt-1 text-xs text-red-600">{errors.house_number.message}</Text>
              )}
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="w-32">
              <Text className="mb-2 text-sm font-medium text-gray-700">PLZ</Text>
              <Controller
                control={control}
                name="postal_code"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className="rounded-lg border border-gray-300 px-4 py-3 text-base"
                    keyboardType="numeric"
                    maxLength={5}
                    value={value ?? ''}
                    onChangeText={onChange}
                  />
                )}
              />
              {errors.postal_code && (
                <Text className="mt-1 text-xs text-red-600">{errors.postal_code.message}</Text>
              )}
            </View>
            <View className="flex-1">
              <Text className="mb-2 text-sm font-medium text-gray-700">Stadt</Text>
              <Controller
                control={control}
                name="city"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className="rounded-lg border border-gray-300 px-4 py-3 text-base"
                    value={value ?? ''}
                    onChangeText={onChange}
                  />
                )}
              />
              {errors.city && (
                <Text className="mt-1 text-xs text-red-600">{errors.city.message}</Text>
              )}
            </View>
          </View>

          <Pressable
            onPress={handleSubmit(onNext)}
            disabled={isSubmitting}
            className="mt-4 rounded-lg bg-primary py-4 active:bg-primary-dark disabled:opacity-50"
          >
            <Text className="text-center text-base font-semibold text-white">
              Weiter zum Code
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
