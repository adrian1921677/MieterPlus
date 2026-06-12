import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { APPOINTMENT_PURPOSE_LABELS_DE, AppointmentPurpose } from '@mieterplus/shared';

interface SlotDetails {
  id: string;
  property_id: string;
  title: string;
  purpose: AppointmentPurpose;
  starts_at: string;
  ends_at: string;
  status: string;
  properties: {
    street: string;
    house_number: string;
    city: string;
  } | null;
  appointment_bookings: {
    tenant_id: string;
    note: string | null;
    profiles: {
      full_name: string;
      email: string;
      phone: string;
    } | null;
  }[] | null;
}

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [slot, setSlot] = useState<SlotDetails | null>(null);

  useEffect(() => {
    async function fetchSlot() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('appointment_slots')
          .select('*, properties(street, house_number, city), appointment_bookings(tenant_id, note, profiles:tenant_id(full_name, email, phone))')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        setSlot(data as any);
      } catch (err) {
        console.error(err);
        Alert.alert('Fehler', 'Termin konnte nicht geladen werden.');
        router.back();
      } finally {
        setLoading(false);
      }
    }
    fetchSlot();
  }, [id]);

  const handleCancel = () => {
    Alert.alert(
      'Termin absagen',
      'Möchtest du diesen Termin wirklich absagen? Der Mieter wird darüber informiert.',
      [
        { text: 'Nein', style: 'cancel' },
        { 
          text: 'Absagen', 
          style: 'destructive',
          onPress: async () => {
            if (!slot) return;
            setCancelling(true);
            try {
              const { error } = await supabase
                .from('appointment_slots')
                .update({ status: 'cancelled' })
                .eq('id', slot.id);
              if (error) throw error;
              
              setSlot(prev => prev ? { ...prev, status: 'cancelled' } : null);
              Alert.alert('Erfolg', 'Termin wurde abgesagt.');
            } catch (err: any) {
              Alert.alert('Fehler', err.message || 'Absagen fehlgeschlagen.');
            } finally {
              setCancelling(false);
            }
          }
        }
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Termin löschen',
      'Möchtest du dieses ungebuchte Zeitfenster löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Löschen', 
          style: 'destructive',
          onPress: async () => {
            if (!slot) return;
            setDeleting(true);
            try {
              const { error } = await supabase
                .from('appointment_slots')
                .delete()
                .eq('id', slot.id);
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

  if (loading || !slot) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#d97706" />
      </View>
    );
  }

  const propStr = slot.properties ? `${slot.properties.street} ${slot.properties.house_number}, ${slot.properties.city}` : 'Unbekannt';
  const booking = slot.appointment_bookings && slot.appointment_bookings.length > 0 ? slot.appointment_bookings[0] : null;

  const isPast = new Date(slot.starts_at).getTime() < Date.now();

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

  const statusColor = getStatusColor(slot.status);

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-4 py-4 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#64748b" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-gray-900">Termin-Details</Text>
          </View>
        </View>
        {(slot.status === 'available' || slot.status === 'cancelled') && !isPast && (
          <TouchableOpacity onPress={handleDelete} disabled={deleting} className="p-2">
            {deleting ? <ActivityIndicator size="small" color="#ef4444" /> : <Ionicons name="trash-outline" size={22} color="#ef4444" />}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <View className="bg-white rounded-xl p-5 border border-gray-200 mb-6 shadow-sm">
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">{slot.title}</Text>
              <Text className="text-sm text-gray-500 mt-1">{APPOINTMENT_PURPOSE_LABELS_DE[slot.purpose]}</Text>
            </View>
            <View className="px-3 py-1.5 rounded-full border" style={{ borderColor: statusColor, backgroundColor: statusColor + '10' }}>
              <Text className="text-xs font-bold" style={{ color: statusColor }}>{getStatusLabel(slot.status)}</Text>
            </View>
          </View>

          <View className="space-y-4">
            <View className="flex-row items-start">
              <Ionicons name="business-outline" size={20} color="#64748b" className="mr-3 mt-0.5" />
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900">Immobilie</Text>
                <Text className="text-sm text-gray-600">{propStr}</Text>
              </View>
            </View>
            <View className="flex-row items-start">
              <Ionicons name="calendar-outline" size={20} color="#64748b" className="mr-3 mt-0.5" />
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900">Datum</Text>
                <Text className="text-sm text-gray-600">
                  {new Date(slot.starts_at).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </View>
            </View>
            <View className="flex-row items-start">
              <Ionicons name="time-outline" size={20} color="#64748b" className="mr-3 mt-0.5" />
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900">Zeitfenster</Text>
                <Text className="text-sm text-gray-600">
                  {new Date(slot.starts_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} - {new Date(slot.ends_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                </Text>
              </View>
            </View>
          </View>
          
          {slot.status === 'booked' && !isPast && (
            <TouchableOpacity 
              onPress={handleCancel}
              disabled={cancelling}
              className="mt-6 border border-red-200 bg-red-50 py-3 rounded-lg flex-row justify-center items-center"
            >
              {cancelling ? <ActivityIndicator size="small" color="#ef4444" /> : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                  <Text className="text-red-600 font-semibold ml-2">Termin absagen</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {booking && (
          <>
            <Text className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3 ml-1">
              Gebucht von
            </Text>
            <View className="bg-white rounded-xl p-5 border border-gray-200 mb-6">
              <View className="flex-row items-center mb-4">
                <View className="h-12 w-12 bg-green-100 rounded-full items-center justify-center mr-4">
                  <Ionicons name="person" size={20} color="#16a34a" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900">{booking.profiles?.full_name}</Text>
                  <Text className="text-sm text-gray-500">Mieter</Text>
                </View>
              </View>

              {booking.profiles?.phone && (
                <View className="flex-row items-center mb-3">
                  <Ionicons name="call-outline" size={18} color="#64748b" className="mr-3" />
                  <Text className="text-sm text-gray-700">{booking.profiles.phone}</Text>
                </View>
              )}

              {booking.profiles?.email && (
                <View className="flex-row items-center mb-4">
                  <Ionicons name="mail-outline" size={18} color="#64748b" className="mr-3" />
                  <Text className="text-sm text-gray-700">{booking.profiles.email}</Text>
                </View>
              )}

              {booking.note ? (
                <View className="bg-gray-50 rounded-lg p-3 border border-gray-100 mt-2">
                  <Text className="text-xs font-semibold text-gray-500 mb-1">NOTIZ DES MIETERS</Text>
                  <Text className="text-sm text-gray-800 italic">"{booking.note}"</Text>
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
