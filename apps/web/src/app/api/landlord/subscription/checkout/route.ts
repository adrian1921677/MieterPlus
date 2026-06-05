import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/guards';

export const runtime = 'nodejs';

/**
 * Erstellt eine Stripe-Checkout-Session für das Premium-Abo — GERÜST.
 *
 * Solange STRIPE_SECRET_KEY / STRIPE_PRICE_PREMIUM nicht gesetzt sind,
 * antwortet die Route mit 503 + Hinweis "Bald verfügbar". Sobald die Keys
 * gesetzt sind, wird eine echte Checkout-Session erstellt und die URL
 * zurückgegeben.
 */
export async function POST() {
  const guard = await requireRole(['landlord', 'admin']);
  if (!guard.ok) return guard.response;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_PREMIUM;
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
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?premium=success`,
      cancel_url: `${appUrl}/dashboard/upgrade?canceled=1`,
      client_reference_id: guard.user.id,
      metadata: { user_id: guard.user.id },
    });
    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Checkout fehlgeschlagen';
    return NextResponse.json({ error: { message: msg } }, { status: 500 });
  }
}
