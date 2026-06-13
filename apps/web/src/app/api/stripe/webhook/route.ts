import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// Stripe-SDK wird dynamisch importiert, damit der Build nicht bricht,
// falls das Paket (noch) nicht installiert oder konfiguriert ist.
export const runtime = 'nodejs';

/**
 * Stripe-Webhook-Endpunkt — GERÜST.
 *
 * Solange STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET nicht gesetzt sind,
 * antwortet der Endpoint mit 503 (Service nicht konfiguriert). Sobald die
 * Keys vorhanden sind, verifiziert er die Signatur und mappt
 * subscription-Events auf profiles.subscription_plan / valid_until.
 *
 * Registrierung bei Stripe später: Webhook-URL = https://<domain>/api/stripe/webhook
 * Events: checkout.session.completed, customer.subscription.updated,
 *         customer.subscription.deleted
 */
export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return NextResponse.json(
      { error: { message: 'Stripe ist noch nicht konfiguriert.', code: 'stripe_not_configured' } },
      { status: 503 },
    );
  }

  let event: import('stripe').Stripe.Event;
  try {
    // Dynamischer Import — nur wenn Keys gesetzt sind
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey);
    const signature = request.headers.get('stripe-signature') ?? '';
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Signaturprüfung fehlgeschlagen';
    return NextResponse.json({ error: { message: msg } }, { status: 400 });
  }

  const service = createSupabaseServiceClient();

  // Helper: Plan-Status setzen anhand Stripe-Customer-ID
  async function applyPlan(
    customerId: string,
    plan: 'trial' | 'plus' | 'pro' | 'payg',
    validUntil: string | null,
    subscriptionId: string | null,
    extra?: { paygModulesJson?: string; paygPriceCents?: number },
  ) {
    const { data: profile } = await service
      .from('profiles')
      .select('id, subscription_plan')
      .eq('stripe_customer_id', customerId)
      .single();
    if (!profile) return;

    const update: Record<string, unknown> = {
      subscription_plan: plan,
      subscription_valid_until: validUntil,
      stripe_subscription_id: subscriptionId,
      subscription_auto_renew: plan === 'plus' || plan === 'pro' || plan === 'payg',
    };
    if (plan === 'payg') {
      if (extra?.paygModulesJson) {
        try {
          update.payg_modules = JSON.parse(extra.paygModulesJson);
        } catch {
          /* ignore */
        }
      }
      if (extra?.paygPriceCents) update.payg_price_cents = extra.paygPriceCents;
    } else {
      update.payg_modules = null;
      update.payg_price_cents = null;
    }

    await service.from('profiles').update(update).eq('id', profile.id);

    await service.from('subscription_events').insert({
      user_id: profile.id,
      old_plan: profile.subscription_plan ?? null,
      new_plan: plan,
      source: 'stripe',
      valid_until: validUntil,
    });
  }

  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub = event.data.object as import('stripe').Stripe.Subscription;
      const active = sub.status === 'active' || sub.status === 'trialing';
      const validUntil = sub.items?.data?.[0]?.current_period_end
        ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
        : null;
      const metaPlan = sub.metadata?.plan;
      const plan: 'plus' | 'pro' | 'payg' =
        metaPlan === 'pro' ? 'pro' : metaPlan === 'payg' ? 'payg' : 'plus';
      const paygModulesJson = sub.metadata?.payg_modules;
      const unitAmount = sub.items?.data?.[0]?.price?.unit_amount;
      // Trial-Periode behalten, sonst Stripe-Status: active=Plan, sonst zurück auf 'trial'
      await applyPlan(
        String(sub.customer),
        active ? plan : 'trial',
        validUntil,
        sub.id,
        { paygModulesJson, paygPriceCents: typeof unitAmount === 'number' ? unitAmount : undefined },
      );
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as import('stripe').Stripe.Subscription;
      // Nach Kündigung zurück in 'trial' (mit Ende = jetzt + 0 d ⇒ inaktiv)
      await applyPlan(String(sub.customer), 'trial', null, null);
      break;
    }
    default:
      // Andere Events ignorieren
      break;
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
