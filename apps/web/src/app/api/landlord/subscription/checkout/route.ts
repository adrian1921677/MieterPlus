import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/guards';

export const runtime = 'nodejs';

/**
 * Erstellt eine Stripe-Checkout-Session für Plus oder Pro (monatlich/jährlich).
 * Body: { plan: 'plus' | 'pro', interval: 'month' | 'year' }
 *
 * Solange die Stripe-Keys/Price-IDs fehlen → 503 mit freundlichem Hinweis.
 */
const PRICE_ENV: Record<string, string | undefined> = {
  'plus_month': process.env.STRIPE_PRICE_PLUS_MONTHLY,
  'plus_year': process.env.STRIPE_PRICE_PLUS_YEARLY,
  'pro_month': process.env.STRIPE_PRICE_PRO_MONTHLY,
  'pro_year': process.env.STRIPE_PRICE_PRO_YEARLY,
};

export async function POST(request: NextRequest) {
  const guard = await requireRole(['landlord', 'admin']);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const plan = body?.plan === 'pro' ? 'pro' : body?.plan === 'plus' ? 'plus' : null;
  const interval = body?.interval === 'year' ? 'year' : 'month';
  if (!plan) {
    return NextResponse.json({ error: { message: "plan muss 'plus' oder 'pro' sein" } }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = PRICE_ENV[`${plan}_${interval}`];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mieterplus.abdullahu.de';

  if (!secretKey || !priceId) {
    return NextResponse.json(
      {
        error: {
          message:
            'Die Online-Bezahlung wird in Kürze freigeschaltet. Bitte wende dich vorerst an den Support, um Premium zu aktivieren.',
          code: 'stripe_not_configured',
        },
      },
      { status: 503 },
    );
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey);

    // Stripe-Customer wiederverwenden/erstellen
    const service = createSupabaseServiceClient();
    const { data: profile } = await service
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', guard.user.id)
      .single();
    let customerId = profile?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const { data: authUser } = await service.auth.admin.getUserById(guard.user.id);
      const customer = await stripe.customers.create({
        email: authUser.user?.email ?? undefined,
        metadata: { user_id: guard.user.id },
      });
      customerId = customer.id;
      await service.from('profiles').update({ stripe_customer_id: customerId }).eq('id', guard.user.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?premium=success`,
      cancel_url: `${appUrl}/dashboard/upgrade?canceled=1`,
      client_reference_id: guard.user.id,
      subscription_data: { metadata: { user_id: guard.user.id, plan } },
      metadata: { user_id: guard.user.id, plan },
      allow_promotion_codes: true,
    });
    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Checkout fehlgeschlagen';
    return NextResponse.json({ error: { message: msg } }, { status: 500 });
  }
}
