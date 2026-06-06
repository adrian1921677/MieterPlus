import { NextResponse, type NextRequest } from 'next/server';
import { APPOINTMENT_PURPOSES } from '@mieterplus/shared';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/guards';

export const runtime = 'nodejs';

/**
 * Termin-Slot anlegen — durch Premium-Eigentümer, Admin oder Hausverwaltung
 * mit 'appointments'-Recht.
 * Body: { property_id, title, purpose, starts_at, ends_at }
 */
export async function POST(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const propertyId = body?.property_id;
  const title = String(body?.title ?? '').trim();
  const purpose = body?.purpose;
  const startsAt = body?.starts_at;
  const endsAt = body?.ends_at;

  if (!/^[0-9a-f-]{36}$/i.test(propertyId ?? '')) {
    return NextResponse.json({ error: { message: 'property_id fehlt' } }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: { message: 'Titel fehlt' } }, { status: 400 });
  }
  if (!(APPOINTMENT_PURPOSES as readonly string[]).includes(purpose)) {
    return NextResponse.json({ error: { message: 'Ungültiger Zweck' } }, { status: 400 });
  }
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return NextResponse.json(
      { error: { message: 'Ungültiger Zeitraum (Ende muss nach Start liegen)' } },
      { status: 400 },
    );
  }

  const service = createSupabaseServiceClient();

  // Berechtigung: Eigentümer (Premium) ODER Admin ODER Hausverwaltung mit 'appointments'
  const { data: property } = await service
    .from('properties')
    .select('owner_id')
    .eq('id', propertyId)
    .single();
  if (!property) {
    return NextResponse.json({ error: { message: 'Immobilie nicht gefunden' } }, { status: 404 });
  }
  const isOwner = property.owner_id === guard.user.id;
  let isManagerWithAppointments = false;
  if (!isOwner && guard.user.role !== 'admin') {
    const { data: mgr } = await service
      .from('property_managers')
      .select('permissions, property_manager_properties!inner(property_id)')
      .eq('manager_id', guard.user.id)
      .eq('status', 'active')
      .eq('property_manager_properties.property_id', propertyId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isManagerWithAppointments = (mgr ?? []).some((m: any) => m.permissions?.appointments === true);
  }
  if (!isOwner && !isManagerWithAppointments && guard.user.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Keine Berechtigung' } }, { status: 403 });
  }

  const { data: slot, error } = await service
    .from('appointment_slots')
    .insert({
      property_id: propertyId,
      created_by: guard.user.id,
      title,
      purpose,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: 'open',
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ id: slot.id }, { status: 201 });
}
