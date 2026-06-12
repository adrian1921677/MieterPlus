import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

interface ManagerItem {
  id: string;
  inviteEmail: string;
  status: string;
  createdAt: string;
  acceptedAt: string | null;
  propertyCount: number;
}

export default function ManagersScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [managers, setManagers] = useState<ManagerItem[]>([]);

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('property_managers')
        .select('id, invite_email, status, created_at, accepted_at, property_manager_properties(property_id)')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: ManagerItem[] = (data || []).map((m: any) => ({
        id: m.id,
        inviteEmail: m.invite_email,
        status: m.status,
        createdAt: m.created_at,
        acceptedAt: m.accepted_at,
        propertyCount: m.property_manager_properties ? m.property_manager_properties.length : 0,
      }));

      setManagers(formatted);
    } catch (err) {
      console.error(err);
      Alert.alert('Fehler', 'Hausverwaltungen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

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
      case 'pending': return 'Ausstehend';
      default: return status;
    }
  };

  const renderItem = ({ item }: { item: ManagerItem }) => {
    const color = getStatusColor(item.status);
    
    return (
      <TouchableOpacity 
        onPress={() => router.push(`/(app)/managers/${item.id}`)}
        className="bg-white rounded-xl p-4 mb-3 border border-gray-200 shadow-sm"
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1">
            <View className="h-10 w-10 bg-emerald-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="person" size={20} color="#16a34a" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>{item.inviteEmail}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                Verwaltet {item.propertyCount} Immobilie{item.propertyCount !== 1 ? 'n' : ''}
              </Text>
            </View>
          </View>
        </View>
        
        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={14} color="#64748b" className="mr-1.5" />
            <Text className="text-xs text-gray-500">
              Eingeladen: {new Date(item.createdAt).toLocaleDateString('de-DE')}
            </Text>
          </View>
          <View className="px-2 py-1 rounded-full border" style={{ borderColor: color, backgroundColor: color + '10' }}>
            <Text className="text-xs font-medium" style={{ color }}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 py-4 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Hausverwaltung</Text>
          <Text className="text-gray-500 text-sm">Berechtigungen & Objekte verwalten</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="close" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <FlatList
          data={managers}
          keyExtractor={s => s.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <Ionicons name="people-outline" size={48} color="#cbd5e1" />
              <Text className="text-gray-500 mt-3 text-center">
                Du hast noch keine Hausverwaltung eingeladen.
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}

      <TouchableOpacity
        onPress={() => router.push('/(app)/managers/new')}
        className="absolute bottom-6 right-6 bg-emerald-600 rounded-full flex-row items-center justify-center px-5 py-3.5 shadow-lg"
        style={{ elevation: 5 }}
      >
        <Ionicons name="person-add" size={20} color="white" />
        <Text className="text-white font-semibold text-base ml-2">Einladen</Text>
      </TouchableOpacity>
    </View>
  );
}
