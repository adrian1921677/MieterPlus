import { NextResponse, type NextRequest } from 'next/server';
import { APPOINTMENT_PURPOSE_LABELS_DE, type AppointmentPurpose } from '@mieterplus/shared';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/guards';
import { notifyUser } from '@/lib/notify';

export const runtime = 'nodejs';

/**
 * Mieter bucht einen offenen Slot.
 * Body: { slot_id, note? }
 * Atomar: Slot open→booked + Booking-Insert. Danach Benachrichtigung an
 * beide Parteien (E-Mail + Push, best-effort).
 */
export async function POST(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const slotId = body?.slot_id;
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) : null;
  if (!/^[0-9a-f-]{36}$/i.test(slotId ?? '')) {
    return NextResponse.json({ error: { message: 'slot_id fehlt' } }, { status: 400 });
  }

  const service = createSupabaseServiceClient();

  const { data: slotRow } = await service
    .from('appointment_slots')
    .select(
      'id, status, title, purpose, starts_at, ends_at, property_id, ' +
        'properties(owner_id, street, house_number, city)',
    )
    .eq('id', slotId)
    .single();

  if (!slotRow) {
    return NextResponse.json({ error: { message: 'Termin nicht gefunden' } }, { status: 404 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slot: any = slotRow;
  if (slot.status !== 'open') {
    return NextResponse.json(
      { error: { message: 'Dieser Termin ist bereits vergeben.', code: 'not_open' } },
      { status: 409 },
    );
  }

  // Mieter muss aktiver Mieter der Property sein
  const { data: tenancy } = await service
    .from('tenancies')
    .select('id, units!inner(property_id)')
    .eq('tenant_id', guard.user.id)
    .is('ended_at', null)
    .eq('units.property_id', slot.property_id)
    .maybeSingle();
  if (!tenancy) {
    return NextResponse.json(
      { error: { message: 'Nur Mieter dieser Immobilie können buchen.' } },
      { status: 403 },
    );
  }

  // Slot reservieren (nur wenn noch open → verhindert Doppelbuchung)
  const { data: updatedSlot, error: updErr } = await service
    .from('appointment_slots')
    .update({ status: 'booked' })
    .eq('id', slotId)
    .eq('status', 'open')
    .select('id')
    .single();
  if (updErr || !updatedSlot) {
    return NextResponse.json(
      { error: { message: 'Termin wurde gerade von jemand anderem gebucht.', code: 'race' } },
      { status: 409 },
    );
  }

  const { error: bookErr } = await service
    .from('appointment_bookings')
    .insert({ slot_id: slotId, tenant_id: guard.user.id, note });
  if (bookErr) {
    // Rollback Slot
    await service.from('appointment_slots').update({ status: 'open' }).eq('id', slotId);
    return NextResponse.json({ error: { message: bookErr.message } }, { status: 500 });
  }

  // Audit
  await service
    .rpc('log_audit', {
      p_action: 'appointment.booked',
      p_entity_type: 'appointment_slot',
      p_entity_id: slotId,
      p_payload: { tenant: guard.user.id },
    })
    .then(() => {}, () => {});

  // Benachrichtigungen (best-effort)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prop: any = (slot as any).properties;
  const when = new Date(slot.starts_at).toLocaleString('de-DE', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const purposeLabel = APPOINTMENT_PURPOSE_LABELS_DE[slot.purpose as AppointmentPurpose];
  const addr = prop ? `${prop.street} ${prop.house_number}, ${prop.city}` : '';

  const ownerId = prop?.owner_id;
  await Promise.allSettled([
    guard.user.id
      ? notifyUser(guard.user.id, {
          title: 'Termin bestätigt',
          body: `Dein Termin „${slot.title}" (${purposeLabel}) am ${when} wurde gebucht. Adresse: ${addr}.`,
          data: { type: 'appointment', slot_id: slotId },
        })
      : Promise.resolve(),
    ownerId
      ? notifyUser(ownerId, {
          title: 'Neue Termin-Buchung',
          body: `Ein Mieter hat den Termin „${slot.title}" (${purposeLabel}) am ${when} gebucht. Adresse: ${addr}.${note ? ` Notiz: ${note}` : ''}`,
          data: { type: 'appointment', slot_id: slotId },
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json({ ok: true }, { status: 200 });
}
