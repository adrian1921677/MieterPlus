import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { getPropertyAccess, propertyIdsWithPermission } from '@/lib/access';
import { APPOINTMENT_PURPOSE_LABELS_DE, AppointmentPurpose } from '@mieterplus/shared';

interface PropertyOption {
  id: string;
  label: string;
}

export default function AppointmentsNewScreen() {
  const router = useRouter();
  const { session } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  
  const [title, setTitle] = useState('');
  const [selectedProperty, setSelectedProperty] = useState('');
  const [purpose, setPurpose] = useState<AppointmentPurpose>('other');
  
  // Basic date/time inputs for simplicity without native date picker dependency
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0] ?? ''; // YYYY-MM-DD
  const [date, setDate] = useState<string>(dateStr);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  
  const fetchProperties = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const access = await getPropertyAccess(supabase, session.user.id);
      const manageableIds = propertyIdsWithPermission(access, 'appointments');
      
      if (manageableIds.length === 0) {
        setLoading(false);
        return;
      }
      
      const { data } = await supabase
        .from('properties')
        .select('id, street, house_number, city')
        .in('id', manageableIds);
        
      const options = (data || []).map(p => ({
        id: p.id,
        label: `${p.street} ${p.house_number}, ${p.city}`
      }));
      
      setProperties(options);
      if (options[0]) {
        setSelectedProperty(options[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchProperties();
    }, [fetchProperties])
  );

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert('Fehler', 'Bitte gib einen Titel ein.');
    if (!selectedProperty) return Alert.alert('Fehler', 'Bitte wähle eine Immobilie.');
    if (!date.trim() || !startTime.trim() || !endTime.trim()) {
      return Alert.alert('Fehler', 'Bitte gib Datum und Uhrzeiten an.');
    }

    setSubmitting(true);
    try {
      // Validate format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Datum muss im Format YYYY-MM-DD sein.');
      if (!/^\d{2}:\d{2}$/.test(startTime)) throw new Error('Startzeit muss im Format HH:MM sein.');
      if (!/^\d{2}:\d{2}$/.test(endTime)) throw new Error('Endzeit muss im Format HH:MM sein.');

      const starts_at = new Date(`${date}T${startTime}:00`).toISOString();
      const ends_at = new Date(`${date}T${endTime}:00`).toISOString();

      if (starts_at >= ends_at) {
        throw new Error('Die Endzeit muss nach der Startzeit liegen.');
      }

      const { error } = await supabase
        .from('appointment_slots')
        .insert({
          property_id: selectedProperty,
          title: title.trim(),
          purpose,
          starts_at,
          ends_at,
        });

      if (error) throw error;

      Alert.alert('Erfolg', 'Termin erfolgreich angelegt.');
      router.back();
    } catch (err: any) {
      console.error('Save error:', err);
      Alert.alert('Fehler', err.message || 'Termin konnte nicht gespeichert werden.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#d97706" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 py-4 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#64748b" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-gray-900">Neuer Termin</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <View className="bg-white p-4 rounded-xl border border-gray-200 space-y-5">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Titel</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="z.B. Besichtigung"
              className="border border-gray-200 rounded-lg px-3 py-2 text-base text-gray-900"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Zweck</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {(Object.keys(APPOINTMENT_PURPOSE_LABELS_DE) as AppointmentPurpose[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPurpose(p)}
                  className={`mr-2 px-3 py-1.5 rounded-full border ${purpose === p ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-200'}`}
                >
                  <Text className={`text-sm ${purpose === p ? 'text-amber-700 font-medium' : 'text-gray-600'}`}>
                    {APPOINTMENT_PURPOSE_LABELS_DE[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Zugehörige Immobilie</Text>
            <View className="border border-gray-200 rounded-lg overflow-hidden">
              {properties.map((p, idx) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedProperty(p.id)}
                  className={`px-3 py-3 flex-row items-center justify-between ${idx !== properties.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <Text className={`text-base ${selectedProperty === p.id ? 'text-amber-600 font-medium' : 'text-gray-700'}`}>
                    {p.label}
                  </Text>
                  {selectedProperty === p.id && <Ionicons name="checkmark" size={20} color="#d97706" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="flex-row items-center justify-between space-x-2">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1">Datum (YYYY-MM-DD)</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="2026-12-31"
                className="border border-gray-200 rounded-lg px-3 py-2 text-base text-gray-900"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <View className="flex-row items-center justify-between mt-2">
            <View className="flex-1 mr-2">
              <Text className="text-sm font-medium text-gray-700 mb-1">Von (HH:MM)</Text>
              <TextInput
                value={startTime}
                onChangeText={setStartTime}
                placeholder="10:00"
                className="border border-gray-200 rounded-lg px-3 py-2 text-base text-gray-900 text-center"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-sm font-medium text-gray-700 mb-1">Bis (HH:MM)</Text>
              <TextInput
                value={endTime}
                onChangeText={setEndTime}
                placeholder="11:00"
                className="border border-gray-200 rounded-lg px-3 py-2 text-base text-gray-900 text-center"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={submitting}
          className={`mt-6 py-3 rounded-lg flex-row items-center justify-center ${submitting ? 'bg-amber-400' : 'bg-amber-500'}`}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="white" />
              <Text className="text-white font-semibold text-base ml-2">Termin speichern</Text>
            </>
          )}
        </TouchableOpacity>
        
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
