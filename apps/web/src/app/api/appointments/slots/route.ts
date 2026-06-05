import { NextResponse, type NextRequest } from 'next/server';
import { APPOINTMENT_PURPOSES } from '@mieterplus/shared';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requirePremium } from '@/lib/guards';

export const runtime = 'nodejs';

/**
 * Vermieter (Premium) erstellt einen Termin-Slot.
 * Body: { property_id, title, purpose, starts_at, ends_at }
 */
export async function POST(request: NextRequest) {
  const guard = await requirePremium();
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

  // Property gehört dem Vermieter?
  const { data: property } = await service
    .from('properties')
    .select('owner_id')
    .eq('id', propertyId)
    .single();
  if (!property || (guard.user.role !== 'admin' && property.owner_id !== guard.user.id)) {
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
