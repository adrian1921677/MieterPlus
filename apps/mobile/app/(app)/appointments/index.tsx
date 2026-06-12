import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { getPropertyAccess, propertyIdsWithPermission } from '@/lib/access';
import { APPOINTMENT_PURPOSE_LABELS_DE, AppointmentPurpose } from '@mieterplus/shared';

interface SlotItem {
  id: string;
  propertyId: string;
  title: string;
  purpose: AppointmentPurpose;
  startsAt: string;
  endsAt: string;
  status: string;
  bookedBy: string | null;
  bookingNote: string | null;
}

export default function AppointmentsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [properties, setProperties] = useState<Record<string, string>>({});
  const [canCreate, setCanCreate] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const access = await getPropertyAccess(supabase, session.user.id);
      const manageableIds = propertyIdsWithPermission(access, 'appointments');
      setCanCreate(manageableIds.length > 0);

      const propIds = manageableIds.length > 0 ? manageableIds : ['00000000-0000-0000-0000-000000000000'];
      
      const { data: propsData } = await supabase
        .from('properties')
        .select('id, street, house_number, city')
        .in('id', propIds);
        
      const propsMap: Record<string, string> = {};
      (propsData || []).forEach(p => {
        propsMap[p.id] = `${p.street} ${p.house_number}, ${p.city}`;
      });
      setProperties(propsMap);

      const { data: slotsData } = await supabase
        .from('appointment_slots')
        .select('id, property_id, title, purpose, starts_at, ends_at, status, appointment_bookings(tenant_id, note, profiles:tenant_id(full_name))')
        .in('property_id', propIds)
        .order('starts_at', { ascending: true });

      const formattedSlots: SlotItem[] = (slotsData || []).map((s: any) => {
        const booking = Array.isArray(s.appointment_bookings) ? s.appointment_bookings[0] : s.appointment_bookings;
        return {
          id: s.id,
          propertyId: s.property_id,
          title: s.title,
          purpose: s.purpose as AppointmentPurpose,
          startsAt: s.starts_at,
          endsAt: s.ends_at,
          status: s.status,
          bookedBy: booking?.profiles?.full_name || null,
          bookingNote: booking?.note || null,
        };
      });

      // Filter out past slots that are unbooked maybe? Let's show all for now or sort them.
      // But we show everything sorted by start date.
      setSlots(formattedSlots);
    } catch (err) {
      console.error(err);
      Alert.alert('Fehler', 'Termine konnten nicht geladen werden.');
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
      case 'available': return '#3b82f6';
      case 'booked': return '#16a34a';
      case 'cancelled': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Verfügbar';
      case 'booked': return 'Gebucht';
      case 'cancelled': return 'Storniert';
      default: return status;
    }
  };

  const renderItem = ({ item }: { item: SlotItem }) => {
    const isPast = new Date(item.startsAt).getTime() < Date.now();
    const color = getStatusColor(item.status);
    
    return (
      <TouchableOpacity 
        onPress={() => router.push(`/(app)/appointments/${item.id}`)}
        className={`bg-white rounded-xl p-4 mb-3 border ${isPast ? 'border-gray-100 opacity-70' : 'border-gray-200'} shadow-sm`}
      >
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-2">
            <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>{item.title}</Text>
            <Text className="text-xs text-gray-500 mt-1">{properties[item.propertyId]}</Text>
          </View>
          <View className="px-2 py-1 rounded-full border" style={{ borderColor: color, backgroundColor: color + '10' }}>
            <Text className="text-xs font-medium" style={{ color }}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>
        
        <View className="flex-row items-center justify-between mt-2">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={16} color="#64748b" className="mr-1" />
            <Text className="text-sm font-medium text-gray-700">
              {new Date(item.startsAt).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr
            </Text>
          </View>
          <Text className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
            {APPOINTMENT_PURPOSE_LABELS_DE[item.purpose]}
          </Text>
        </View>

        {item.bookedBy && (
          <View className="mt-3 pt-3 border-t border-gray-100 flex-row items-center">
            <View className="h-6 w-6 bg-green-100 rounded-full items-center justify-center mr-2">
              <Ionicons name="person" size={12} color="#16a34a" />
            </View>
            <Text className="text-sm text-gray-700 flex-1" numberOfLines={1}>
              Gebucht von <Text className="font-semibold">{item.bookedBy}</Text>
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 py-4 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Terminplaner</Text>
          <Text className="text-gray-500 text-sm">Zeitfenster & Besichtigungen</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="close" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#d97706" />
        </View>
      ) : (
        <FlatList
          data={slots}
          keyExtractor={s => s.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
              <Text className="text-gray-500 mt-3 text-center">
                Keine Termine vorhanden.
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}

      {canCreate && (
        <TouchableOpacity
          onPress={() => router.push('/(app)/appointments/new')}
          className="absolute bottom-6 right-6 w-14 h-14 bg-amber-500 rounded-full items-center justify-center shadow-lg"
          style={{ elevation: 5 }}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}
