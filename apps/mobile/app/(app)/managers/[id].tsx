import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Switch } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { ManagerPermissions } from '@mieterplus/shared';

interface ManagerDetails {
  id: string;
  invite_email: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  permissions: ManagerPermissions;
  property_manager_properties: {
    property_id: string;
    properties: {
      street: string;
      house_number: string;
      city: string;
    } | null;
  }[] | null;
}

export default function ManagerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [manager, setManager] = useState<ManagerDetails | null>(null);
  
  const [perms, setPerms] = useState<ManagerPermissions>({
    requests: false,
    vault: false,
    appointments: false,
    properties: false,
  });

  useEffect(() => {
    async function fetchManager() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('property_managers')
          .select('*, property_manager_properties(property_id, properties(street, house_number, city))')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        setManager(data as any);
        if (data?.permissions) {
          setPerms(data.permissions as any);
        }
      } catch (err) {
        console.error(err);
        Alert.alert('Fehler', 'Details konnten nicht geladen werden.');
        router.back();
      } finally {
        setLoading(false);
      }
    }
    fetchManager();
  }, [id]);

  const togglePerm = (key: keyof ManagerPermissions) => {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSavePerms = async () => {
    if (!manager) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('property_managers')
        .update({ permissions: perms })
        .eq('id', manager.id);
        
      if (error) throw error;
      Alert.alert('Erfolg', 'Berechtigungen wurden aktualisiert.');
      setManager(prev => prev ? { ...prev, permissions: perms } : null);
    } catch (err: any) {
      Alert.alert('Fehler', err.message || 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Zugriff entziehen',
      'Möchtest du dieser Hausverwaltung den Zugriff komplett entziehen? Diese Aktion kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Entfernen', 
          style: 'destructive',
          onPress: async () => {
            if (!manager) return;
            setDeleting(true);
            try {
              const { error } = await supabase
                .from('property_managers')
                .delete()
                .eq('id', manager.id);
              if (error) throw error;
              router.back();
            } catch (err: any) {
              Alert.alert('Fehler', err.message || 'Löschen fehlgeschlagen.');
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  if (loading || !manager) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#16a34a';
      case 'pending': return '#d97706';
      default: return '#64748b';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'pending': return 'Ausstehend (Wartet auf Registrierung)';
      default: return status;
    }
  };

  const statusColor = getStatusColor(manager.status);
  const properties = manager.property_manager_properties || [];

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 py-4 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#64748b" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-gray-900">Details</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleDelete} disabled={deleting} className="p-2">
          {deleting ? <ActivityIndicator size="small" color="#ef4444" /> : <Ionicons name="trash-outline" size={22} color="#ef4444" />}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <View className="bg-white rounded-xl p-5 border border-gray-200 mb-6 shadow-sm">
          <View className="items-center mb-5">
            <View className="h-16 w-16 bg-emerald-100 rounded-full items-center justify-center mb-3">
              <Ionicons name="person" size={32} color="#10b981" />
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center">{manager.invite_email}</Text>
            
            <View className="mt-3 px-3 py-1.5 rounded-full border" style={{ borderColor: statusColor, backgroundColor: statusColor + '10' }}>
              <Text className="text-xs font-bold" style={{ color: statusColor }}>{getStatusLabel(manager.status)}</Text>
            </View>
          </View>

          <View className="space-y-3 pt-3 border-t border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={16} color="#64748b" className="mr-2" />
              <Text className="text-sm text-gray-700">Eingeladen am {new Date(manager.created_at).toLocaleDateString('de-DE')}</Text>
            </View>
            {manager.accepted_at && (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle-outline" size={16} color="#64748b" className="mr-2" />
                <Text className="text-sm text-gray-700">Akzeptiert am {new Date(manager.accepted_at).toLocaleDateString('de-DE')}</Text>
              </View>
            )}
          </View>
        </View>

        <Text className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-2 ml-1">
          Berechtigungen anpassen
        </Text>
        <View className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <PermRow title="Mängel bearbeiten" active={!!perms.requests} onToggle={() => togglePerm('requests')} />
          <PermRow title="Dokumenten-Tresor" active={!!perms.vault} onToggle={() => togglePerm('vault')} />
          <PermRow title="Terminplaner" active={!!perms.appointments} onToggle={() => togglePerm('appointments')} />
          <PermRow title="Immobilien & Mieter einsehen" active={!!perms.properties} onToggle={() => togglePerm('properties')} isLast />
        </View>

        <TouchableOpacity
          onPress={handleSavePerms}
          disabled={saving}
          className={`mb-8 py-3 rounded-lg flex-row items-center justify-center ${saving ? 'bg-gray-200' : 'bg-gray-100 border border-gray-200'}`}
        >
          {saving ? (
            <ActivityIndicator color="#64748b" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#475569" />
              <Text className="text-gray-700 font-medium text-sm ml-2">Änderungen speichern</Text>
            </>
          )}
        </TouchableOpacity>

        <Text className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-2 ml-1">
          Zugewiesene Immobilien ({properties.length})
        </Text>
        <View className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          {properties.length === 0 ? (
            <Text className="p-4 text-gray-500 text-sm text-center">Keine Immobilien zugewiesen.</Text>
          ) : (
            properties.map((p, i) => (
              <View key={p.property_id} className={`p-4 flex-row items-center ${i !== properties.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <View className="h-8 w-8 bg-gray-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="business" size={14} color="#64748b" />
                </View>
                <Text className="text-sm font-medium text-gray-900 flex-1">
                  {p.properties ? `${p.properties.street} ${p.properties.house_number}, ${p.properties.city}` : 'Unbekannte Immobilie'}
                </Text>
              </View>
            ))
          )}
        </View>
        
        <View className="h-4" />
      </ScrollView>
    </View>
  );
}

function PermRow({ title, active, onToggle, isLast }: { title: string; active: boolean; onToggle: () => void; isLast?: boolean }) {
  return (
    <View className={`flex-row items-center justify-between p-4 ${!isLast ? 'border-b border-gray-100' : ''}`}>
      <Text className="text-sm text-gray-800">{title}</Text>
      <Switch value={active} onValueChange={onToggle} trackColor={{ true: '#10b981', false: '#cbd5e1' }} />
    </View>
  );
}
