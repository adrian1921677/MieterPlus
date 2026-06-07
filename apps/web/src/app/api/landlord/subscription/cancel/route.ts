import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/guards';

export const runtime = 'nodejs';

/**
 * Kündigt das laufende Abo.
 * - Mit Stripe-Abo: cancel_at_period_end → Zugang bleibt bis Periodenende,
 *   danach setzt der Webhook (subscription.deleted) den Plan auf 'free'.
 * - Ohne Stripe (manuell freigeschaltet): auto_renew aus; der Zugang
 *   läuft mit subscription_valid_until automatisch aus (is_premium prüft das).
 */
export async function POST() {
  const guard = await requireRole(['landlord', 'admin']);
  if (!guard.ok) return guard.response;

  const service = createSupabaseServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('subscription_plan, subscription_valid_until, stripe_subscription_id')
    .eq('id', guard.user.id)
    .single();

  if (!profile || profile.subscription_plan === 'free') {
    return NextResponse.json(
      { error: { message: 'Es ist kein bezahltes Abo aktiv.' } },
      { status: 409 },
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  let endsAt = profile.subscription_valid_until as string | null;

  if (secretKey && profile.stripe_subscription_id) {
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(secretKey);
      const sub = await stripe.subscriptions.update(profile.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      const periodEnd = sub.items?.data?.[0]?.current_period_end;
      if (periodEnd) endsAt = new Date(periodEnd * 1000).toISOString();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kündigung bei Stripe fehlgeschlagen';
      return NextResponse.json({ error: { message: msg } }, { status: 500 });
    }
  }

  // auto_renew aus; Zugang bleibt bis valid_until bestehen
  await service
    .from('profiles')
    .update({ subscription_auto_renew: false })
    .eq('id', guard.user.id);

  await service
    .rpc('log_audit', {
      p_action: 'subscription.cancelled',
      p_entity_type: 'profile',
      p_entity_id: guard.user.id,
      p_payload: { ends_at: endsAt },
    })
    .then(() => {}, () => {});

  return NextResponse.json({ ok: true, ends_at: endsAt }, { status: 200 });
}
