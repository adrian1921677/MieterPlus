import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/guards';

/**
 * Admin schaltet einem Vermieter Premium frei oder entzieht es.
 * Dient als Ersatz für Stripe, solange die Bezahl-Integration noch nicht live ist.
 *
 * Body: { user_id: uuid, plan: 'basic'|'premium', months?: number }
 */
export async function POST(request: NextRequest) {
  const guard = await requireRole(['admin']);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const userId = body?.user_id;
  const plan = body?.plan;
  const months = typeof body?.months === 'number' ? body.months : 12;

  if (typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return NextResponse.json({ error: { message: 'user_id (uuid) erforderlich' } }, { status: 400 });
  }
  if (plan !== 'trial' && plan !== 'plus' && plan !== 'pro' && plan !== 'payg') {
    return NextResponse.json(
      { error: { message: "plan muss 'trial', 'plus', 'pro' oder 'payg' sein" } },
      { status: 400 },
    );
  }

  const service = createSupabaseServiceClient();

  // Alten Plan lesen (für Audit)
  const { data: target } = await service
    .from('profiles')
    .select('subscription_plan, role')
    .eq('id', userId)
    .single();

  if (!target) {
    return NextResponse.json({ error: { message: 'User nicht gefunden' } }, { status: 404 });
  }

  const validUntil = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error: updErr } = await service
    .from('profiles')
    .update({
      subscription_plan: plan,
      subscription_valid_until: validUntil,
    })
    .eq('id', userId);

  if (updErr) {
    return NextResponse.json({ error: { message: updErr.message } }, { status: 500 });
  }

  // Audit: subscription_events
  await service.from('subscription_events').insert({
    user_id: userId,
    old_plan: target.subscription_plan ?? null,
    new_plan: plan,
    source: 'admin',
    valid_until: validUntil,
    actor_id: guard.user.id,
  });

  await service
    .rpc('log_audit', {
      p_action: plan === 'trial' ? 'subscription.trial' : 'subscription.granted',
      p_entity_type: 'profile',
      p_entity_id: userId,
      p_payload: { plan, valid_until: validUntil, by: guard.user.id },
    })
    .then(() => {}, () => {});

  return NextResponse.json({ plan, valid_until: validUntil }, { status: 200 });
}
