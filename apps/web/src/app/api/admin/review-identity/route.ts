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
  const userId = body?.user_id;
  const decision = body?.decision;
  const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 2000) : null;

  if (typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return NextResponse.json(
      { error: { message: 'user_id (uuid) erforderlich' } },
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

  const { data: target, error: tErr } = await service
    .from('profiles')
    .select('id, identity_verified_at')
    .eq('id', userId)
    .maybeSingle();

  if (tErr) return NextResponse.json({ error: { message: tErr.message } }, { status: 500 });
  if (!target)
    return NextResponse.json({ error: { message: 'Profil nicht gefunden' } }, { status: 404 });

  const update =
    decision === 'verified'
      ? {
          identity_verified_at: new Date().toISOString(),
          identity_verified_by: user.id,
          identity_rejection_reason: null,
        }
      : {
          identity_verified_at: null,
          identity_verified_by: user.id,
          identity_rejection_reason: reason,
        };

  const { data: updated, error: upErr } = await service
    .from('profiles')
    .update(update)
    .eq('id', userId)
    .select('id, identity_verified_at, identity_rejection_reason')
    .single();

  if (upErr) return NextResponse.json({ error: { message: upErr.message } }, { status: 500 });

  await service.rpc('log_audit', {
    p_action: `identity.${decision}`,
    p_entity_type: 'profile',
    p_entity_id: userId,
    p_payload: { reason, actor: user.id },
  });

  return NextResponse.json({ profile: updated });
}
