import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Admin-Rolle erforderlich' } }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const propertyId = body?.property_id;
  const decision = body?.decision;
  const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 2000) : null;

  if (typeof propertyId !== 'string' || !/^[0-9a-f-]{36}$/i.test(propertyId)) {
    return NextResponse.json(
      { error: { message: 'property_id (uuid) erforderlich' } },
      { status: 400 },
    );
  }
  if (decision !== 'verified' && decision !== 'rejected') {
    return NextResponse.json(
      { error: { message: 'decision muss "verified" oder "rejected" sein' } },
      { status: 400 },
    );
  }
  if (decision === 'rejected' && (!reason || reason.length < 5)) {
    return NextResponse.json(
      { error: { message: 'Bei Ablehnung ist eine Begründung Pflicht' } },
      { status: 400 },
    );
  }

  const service = createSupabaseServiceClient();

  const { data: existing, error: exErr } = await service
    .from('properties')
    .select('id, ownership_status')
    .eq('id', propertyId)
    .maybeSingle();

  if (exErr) return NextResponse.json({ error: { message: exErr.message } }, { status: 500 });
  if (!existing)
    return NextResponse.json({ error: { message: 'Property nicht gefunden' } }, { status: 404 });
  if (existing.ownership_status !== 'pending') {
    return NextResponse.json(
      { error: { message: `Property ist bereits ${existing.ownership_status}` } },
      { status: 409 },
    );
  }

  const { data: updated, error: upErr } = await service
    .from('properties')
    .update({
      ownership_status: decision,
      verified_at: decision === 'verified' ? new Date().toISOString() : null,
      verified_by: user.id,
      rejection_reason: decision === 'rejected' ? reason : null,
    })
    .eq('id', propertyId)
    .select('id, ownership_status, verified_at, verified_by, rejection_reason')
    .single();

  if (upErr) return NextResponse.json({ error: { message: upErr.message } }, { status: 500 });

  await service.rpc('log_audit', {
    p_action: `property.${decision}`,
    p_entity_type: 'property',
    p_entity_id: propertyId,
    p_payload: { reason, actor: user.id },
  });

  return NextResponse.json({ property: updated });
}
