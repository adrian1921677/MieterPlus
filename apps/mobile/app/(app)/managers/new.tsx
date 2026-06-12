import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

interface PropertyOption {
  id: string;
  label: string;
}

export default function ManagersNewScreen() {
  const router = useRouter();
  const { session } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  
  const [email, setEmail] = useState('');
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  
  const [perms, setPerms] = useState({
    requests: true,
    vault: true,
    appointments: true,
    properties: true,
  });

  const toggleProperty = (id: string) => {
    const next = new Set(selectedProperties);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedProperties(next);
  };
  
  const togglePerm = (key: keyof typeof perms) => {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchProperties = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const { data } = await supabase
        .from('properties')
        .select('id, street, house_number, city')
        .eq('owner_id', session.user.id);
        
      const options = (data || []).map(p => ({
        id: p.id,
        label: `${p.street} ${p.house_number}, ${p.city}`
      }));
      
      setProperties(options);
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
    if (!email.trim() || !email.includes('@')) {
      return Alert.alert('Fehler', 'Bitte gib eine gültige E-Mail-Adresse ein.');
    }
    if (selectedProperties.size === 0) {
      return Alert.alert('Fehler', 'Bitte weise mindestens eine Immobilie zu.');
    }

    setSubmitting(true);
    try {
      const { data: manager, error: mError } = await supabase
        .from('property_managers')
        .insert({
          owner_id: session!.user.id,
          invite_email: email.trim().toLowerCase(),
          permissions: perms,
          status: 'pending',
        })
        .select('id')
        .single();

      if (mError) throw mError;

      const links = Array.from(selectedProperties).map(pid => ({
        property_manager_id: manager.id,
        property_id: pid,
      }));

      const { error: lError } = await supabase
        .from('property_manager_properties')
        .insert(links);

      if (lError) throw lError;

      Alert.alert('Erfolg', 'Einladung wurde erstellt!');
      router.back();
    } catch (err: any) {
      console.error('Save error:', err);
      Alert.alert('Fehler', err.message || 'Die Einladung konnte nicht versendet werden.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#10b981" />
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
            <Text className="text-xl font-bold text-gray-900">Einladen</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <View className="bg-white p-4 rounded-xl border border-gray-200 space-y-5">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">E-Mail Adresse der Hausverwaltung</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="z.B. info@hausverwaltung.de"
              keyboardType="email-address"
              autoCapitalize="none"
              className="border border-gray-200 rounded-lg px-3 py-2 text-base text-gray-900"
            />
            <Text className="text-xs text-gray-500 mt-1">
              Sobald sie sich mit dieser E-Mail registriert, erhält sie Zugriff.
            </Text>
          </View>
          
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Berechtigungen</Text>
            <View className="border border-gray-100 rounded-lg bg-gray-50 overflow-hidden">
              <PermRow title="Mängel bearbeiten" active={perms.requests} onToggle={() => togglePerm('requests')} />
              <PermRow title="Dokumenten-Tresor" active={perms.vault} onToggle={() => togglePerm('vault')} />
              <PermRow title="Terminplaner" active={perms.appointments} onToggle={() => togglePerm('appointments')} />
              <PermRow title="Immobilien & Mieter einsehen" active={perms.properties} onToggle={() => togglePerm('properties')} isLast />
            </View>
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Zuzuweisende Immobilien</Text>
            <View className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              {properties.length === 0 && (
                <Text className="p-4 text-gray-500 text-sm text-center">Du hast noch keine Immobilien angelegt.</Text>
              )}
              {properties.map((p, idx) => {
                const isSelected = selectedProperties.has(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => toggleProperty(p.id)}
                    className={`px-3 py-3 flex-row items-center justify-between ${idx !== properties.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <View className="flex-row items-center flex-1 pr-2">
                      <View className={`w-5 h-5 rounded border items-center justify-center mr-3 ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                      </View>
                      <Text className={`text-base flex-1 ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                        {p.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={submitting || properties.length === 0}
          className={`mt-6 py-3 rounded-lg flex-row items-center justify-center ${(submitting || properties.length === 0) ? 'bg-emerald-400' : 'bg-emerald-600'}`}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="send-outline" size={20} color="white" />
              <Text className="text-white font-semibold text-base ml-2">Einladung senden</Text>
            </>
          )}
        </TouchableOpacity>
        
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}

function PermRow({ title, active, onToggle, isLast }: { title: string; active: boolean; onToggle: () => void; isLast?: boolean }) {
  return (
    <View className={`flex-row items-center justify-between p-3 ${!isLast ? 'border-b border-gray-100' : ''}`}>
      <Text className="text-sm text-gray-800">{title}</Text>
      <Switch value={active} onValueChange={onToggle} trackColor={{ true: '#10b981', false: '#cbd5e1' }} />
    </View>
  );
}
