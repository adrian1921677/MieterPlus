import { type NextRequest, NextResponse } from 'next/server';
import { APPOINTMENT_PURPOSE_LABELS_DE, type AppointmentPurpose } from '@mieterplus/shared';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/guards';

export const runtime = 'nodejs';

function toICSDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICS(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Liefert einen Termin als .ics-Datei (Apple/Google/Outlook-Kalender). */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: slotId } = await ctx.params;
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const service = createSupabaseServiceClient();
  const { data: slot } = await service
    .from('appointment_slots')
    .select(
      'id, title, purpose, starts_at, ends_at, property_id, properties(street, house_number, postal_code, city, owner_id), appointment_bookings(tenant_id)',
    )
    .eq('id', slotId)
    .single();

  if (!slot) return NextResponse.json({ error: { message: 'Nicht gefunden' } }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = slot;
  const ownerId = s.properties?.owner_id;
  const booking = Array.isArray(s.appointment_bookings)
    ? s.appointment_bookings[0]
    : s.appointment_bookings;
  const isParticipant =
    guard.user.id === ownerId || guard.user.id === booking?.tenant_id || guard.user.role === 'admin';
  if (!isParticipant) {
    return NextResponse.json({ error: { message: 'Kein Zugriff' } }, { status: 403 });
  }

  const prop = s.properties;
  const location = prop
    ? `${prop.street} ${prop.house_number}, ${prop.postal_code} ${prop.city}`
    : '';
  const purposeLabel = APPOINTMENT_PURPOSE_LABELS_DE[s.purpose as AppointmentPurpose];

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ADB//Mieter+//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${s.id}@mieterplus.abdullahu.de`,
    `DTSTAMP:${toICSDate(new Date().toISOString())}`,
    `DTSTART:${toICSDate(s.starts_at)}`,
    `DTEND:${toICSDate(s.ends_at)}`,
    `SUMMARY:${escapeICS(`${s.title} (${purposeLabel})`)}`,
    `LOCATION:${escapeICS(location)}`,
    `DESCRIPTION:${escapeICS(`Termin über Mieter + — ${purposeLabel}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="termin-${s.id}.ics"`,
    },
  });
}
