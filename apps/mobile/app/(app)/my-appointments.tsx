import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  APPOINTMENT_PURPOSE_LABELS_DE,
  type AppointmentPurpose,
} from '@mieterplus/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Slot = {
  id: string;
  title: string;
  purpose: AppointmentPurpose;
  starts_at: string;
  ends_at: string;
  status: string;
  address: string;
  mine: boolean;
};

/**
 * Mieter-Termine: gebuchte + offene Slots der eigenen Properties.
 * 1:1 wie Web /dashboard/my-appointments. Buchung/Storno via RPC.
 */
export default function MyAppointmentsScreen() {
  const { session } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busySlot, setBusySlot] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('appointment_slots')
      .select(
        'id, title, purpose, starts_at, ends_at, status, properties(street, house_number, city), appointment_bookings(tenant_id)',
      )
      .neq('status', 'cancelled')
      .gte('ends_at', new Date().toISOString())
      .order('starts_at', { ascending: true });

    setSlots(
      (data ?? []).map((s) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ss: any = s;
        const prop = ss.properties;
        const bookings = Array.isArray(ss.appointment_bookings)
          ? ss.appointment_bookings
          : ss.appointment_bookings
            ? [ss.appointment_bookings]
            : [];
        return {
          id: ss.id,
          title: ss.title,
          purpose: ss.purpose,
          starts_at: ss.starts_at,
          ends_at: ss.ends_at,
          status: ss.status,
          address: prop ? `${prop.street} ${prop.house_number}, ${prop.city}` : '',
          mine: bookings.some((b: { tenant_id: string }) => b.tenant_id === session.user.id),
        };
      }),
    );
    setLoading(false);
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const book = async (slot: Slot) => {
    setBusySlot(slot.id);
    const { error } = await supabase.rpc('book_appointment_slot', {
      p_slot_id: slot.id,
      p_note: null,
    });
    setBusySlot(null);
    if (error) {
      Alert.alert('Buchung fehlgeschlagen', error.message);
      return;
    }
    Alert.alert('Termin gebucht', `„${slot.title}" ist für dich reserviert.`);
    await load();
  };

  const cancel = async (slot: Slot) => {
    Alert.alert('Termin stornieren?', `„${slot.title}" wird wieder freigegeben.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Stornieren',
        style: 'destructive',
        onPress: async () => {
          setBusySlot(slot.id);
          const { error } = await supabase.rpc('cancel_appointment_booking', {
            p_slot_id: slot.id,
          });
          setBusySlot(null);
          if (error) {
            Alert.alert('Fehler', error.message);
            return;
          }
          await load();
        },
      },
    ]);
  };

  const mine = slots.filter((s) => s.mine);
  const open = slots.filter((s) => s.status === 'open' && !s.mine);

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="p-4 gap-4 pb-10"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View>
        <Text className="text-2xl font-bold text-foreground">Termine</Text>
        <Text className="text-sm text-muted-foreground">
          Buche freie Termine deines Vermieters für Reparaturen oder Besichtigungen.
        </Text>
      </View>

      {mine.length > 0 && (
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Meine gebuchten Termine
          </Text>
          {mine.map((s) => (
            <SlotCard key={s.id} slot={s} busy={busySlot === s.id} onCancel={() => cancel(s)} />
          ))}
        </View>
      )}

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Freie Termine
        </Text>
        {!loading && open.length === 0 ? (
          <Card>
            <CardContent className="items-center gap-3 py-10">
              <Ionicons name="calendar-outline" size={44} color="#94a3b8" />
              <Text className="text-base font-semibold text-foreground">
                Keine freien Termine
              </Text>
              <Text className="text-center text-sm text-muted-foreground">
                Sobald dein Vermieter Termine anbietet, erscheinen sie hier.
              </Text>
            </CardContent>
          </Card>
        ) : (
          open.map((s) => (
            <SlotCard key={s.id} slot={s} busy={busySlot === s.id} onBook={() => book(s)} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function SlotCard({
  slot,
  busy,
  onBook,
  onCancel,
}: {
  slot: Slot;
  busy: boolean;
  onBook?: () => void;
  onCancel?: () => void;
}) {
  const start = new Date(slot.starts_at);
  const end = new Date(slot.ends_at);
  const dateLabel = start.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeLabel = `${start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <Card>
      <CardContent className="gap-3 p-4">
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1">
            <Text className="text-sm font-semibold text-foreground">{slot.title}</Text>
            <Text className="text-xs text-muted-foreground">{slot.address}</Text>
          </View>
          <Badge variant="outline">
            {APPOINTMENT_PURPOSE_LABELS_DE[slot.purpose] ?? slot.purpose}
          </Badge>
        </View>
        <View className="flex-row items-center gap-4">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="calendar-clear-outline" size={14} color="#64748b" />
            <Text className="text-xs text-foreground">{dateLabel}</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="time-outline" size={14} color="#64748b" />
            <Text className="text-xs text-foreground">{timeLabel}</Text>
          </View>
        </View>
        {onBook && (
          <Button fullWidth size="sm" loading={busy} onPress={onBook}>
            Termin buchen
          </Button>
        )}
        {onCancel && (
          <Button fullWidth size="sm" variant="outline" loading={busy} onPress={onCancel}>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="close-circle-outline" size={15} color="#ef4444" />
              <Text className="text-xs font-medium text-destructive">Stornieren</Text>
            </View>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
