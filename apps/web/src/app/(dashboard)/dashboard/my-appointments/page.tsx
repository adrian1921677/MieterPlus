import { redirect } from 'next/navigation';
import { CalendarClock } from 'lucide-react';
import {
  APPOINTMENT_PURPOSE_LABELS_DE,
  type AppointmentPurpose,
} from '@mieterplus/shared';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TenantAppointments } from './tenant-appointments';

export const metadata = { title: 'Termine' };

export default async function MyAppointmentsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = createSupabaseServiceClient();

  // Properties des Mieters (aktive Tenancies)
  const { data: tenancies } = await service
    .from('tenancies')
    .select('units!inner(property_id)')
    .eq('tenant_id', user.id)
    .is('ended_at', null);
  const propIds = Array.from(
    new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tenancies ?? []).map((t: any) => t.units?.property_id).filter(Boolean),
    ),
  ) as string[];

  // Offene Slots dieser Properties + eigene Buchungen
  const { data: slots } = propIds.length
    ? await service
        .from('appointment_slots')
        .select(
          'id, property_id, title, purpose, starts_at, ends_at, status, ' +
            'properties(street, house_number, city), appointment_bookings(tenant_id)',
        )
        .in('property_id', propIds)
        .neq('status', 'cancelled')
        .gte('ends_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
    : { data: [] };

  const slotData = (slots ?? []).map((s) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ss: any = s;
    const prop = ss.properties;
    const booking = Array.isArray(ss.appointment_bookings)
      ? ss.appointment_bookings[0]
      : ss.appointment_bookings;
    return {
      id: ss.id as string,
      title: ss.title as string,
      purpose: ss.purpose as AppointmentPurpose,
      startsAt: ss.starts_at as string,
      endsAt: ss.ends_at as string,
      status: ss.status as string,
      address: prop ? `${prop.street} ${prop.house_number}, ${prop.city}` : '',
      mine: booking?.tenant_id === user.id,
    };
  });

  // Eigene Buchungen zuerst, dann offene
  const open = slotData.filter((s) => s.status === 'open');
  const mine = slotData.filter((s) => s.mine);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <CalendarClock className="h-6 w-6 text-[#2563a8]" />
          Termine
        </h1>
        <p className="text-muted-foreground">
          Buche freie Termine deines Vermieters für Reparaturen oder Besichtigungen.
        </p>
      </div>

      {mine.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Meine gebuchten Termine
          </h2>
          <TenantAppointments slots={mine} purposeLabels={APPOINTMENT_PURPOSE_LABELS_DE} booked />
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Freie Termine
        </h2>
        {open.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Keine freien Termine</CardTitle>
              <CardDescription>
                Dein Vermieter hat aktuell keine offenen Termine. Schau später wieder vorbei.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <TenantAppointments slots={open} purposeLabels={APPOINTMENT_PURPOSE_LABELS_DE} />
        )}
      </div>
    </div>
  );
}
