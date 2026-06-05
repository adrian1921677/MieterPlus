import { redirect } from 'next/navigation';
import { CalendarClock } from 'lucide-react';
import {
  APPOINTMENT_PURPOSE_LABELS_DE,
  type AppointmentPurpose,
} from '@mieterplus/shared';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { PremiumGate } from '@/components/premium-gate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppointmentManager } from './appointment-manager';

export const metadata = { title: 'Terminplaner' };

export default async function AppointmentsPage() {
  return (
    <PremiumGate feature="Terminplaner">
      <AppointmentsInner />
    </PremiumGate>
  );
}

async function AppointmentsInner() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = createSupabaseServiceClient();

  const { data: properties } = await service
    .from('properties')
    .select('id, street, house_number, postal_code, city')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  const propIds = (properties ?? []).map((p) => p.id);

  const { data: slots } = propIds.length
    ? await service
        .from('appointment_slots')
        .select(
          'id, property_id, title, purpose, starts_at, ends_at, status, ' +
            'appointment_bookings(tenant_id, note, booked_at, profiles:tenant_id(full_name))',
        )
        .in('property_id', propIds)
        .order('starts_at', { ascending: true })
    : { data: [] };

  const propertyOptions = (properties ?? []).map((p) => ({
    id: p.id,
    label: `${p.street} ${p.house_number}, ${p.postal_code} ${p.city}`,
  }));
  const propLabels = Object.fromEntries(propertyOptions.map((p) => [p.id, p.label]));

  const slotData = (slots ?? []).map((s) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ss: any = s;
    const booking = Array.isArray(ss.appointment_bookings)
      ? ss.appointment_bookings[0]
      : ss.appointment_bookings;
    return {
      id: ss.id as string,
      propertyId: ss.property_id as string,
      title: ss.title as string,
      purpose: ss.purpose as AppointmentPurpose,
      startsAt: ss.starts_at as string,
      endsAt: ss.ends_at as string,
      status: ss.status as string,
      bookedBy: booking?.profiles?.full_name ?? null,
      bookingNote: booking?.note ?? null,
    };
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <CalendarClock className="h-6 w-6 text-[#2563a8]" />
          Terminplaner
        </h1>
        <p className="text-muted-foreground">
          Biete freie Zeit-Slots an — Mieter buchen mit einem Klick, beide werden benachrichtigt.
        </p>
      </div>

      {propertyOptions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Keine Immobilie vorhanden</CardTitle>
            <CardDescription>Lege zuerst eine Immobilie an, um Termine anzubieten.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <AppointmentManager
          propertyOptions={propertyOptions}
          propLabels={propLabels}
          slots={slotData}
          purposeLabels={APPOINTMENT_PURPOSE_LABELS_DE}
        />
      )}
    </div>
  );
}
