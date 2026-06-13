import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import {
  calcPaygPriceCents,
  PAYG_DEFAULT_MODULES,
  type PaygModules,
} from '@mieterplus/shared';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/guards';

export const runtime = 'nodejs';

/**
 * Erstellt eine Stripe-Checkout-Session.
 *
 * Body:
 *  - { plan: 'plus' | 'pro' }
 *  - { plan: 'payg', modules: PaygModules, price_cents?: number }
 *
 * Für Plus/Pro: Stripe-Price-IDs aus Env.
 * Für PayG: dynamische `price_data` mit `recurring.interval='month'`. Optional
 * kann eine vorbereitete Price-ID per `STRIPE_PRICE_PAYG_BASE` referenziert
 * werden — dann wird sie als Anker genutzt.
 */
const PRICE_ENV: Record<string, string | undefined> = {
  plus: process.env.STRIPE_PRICE_PLUS_MONTHLY,
  pro: process.env.STRIPE_PRICE_PRO_MONTHLY,
};

function sanitizeModules(m: unknown): PaygModules {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const x = (m ?? {}) as any;
  const clamp = (v: unknown, max = 50) =>
    Math.max(0, Math.min(max, Number.isFinite(Number(v)) ? Math.floor(Number(v)) : 0));
  return {
    extraProperties: clamp(x.extraProperties),
    unitsBundles: clamp(x.unitsBundles, 100),
    vaultBundles: clamp(x.vaultBundles, 100),
    handover: x.handover === true,
    appointmentsPremium: x.appointmentsPremium === true,
    managers: clamp(x.managers, 20),
  };
}

export async function POST(request: NextRequest) {
  const guard = await requireRole(['landlord', 'admin']);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const planRaw = body?.plan;
  const plan: 'plus' | 'pro' | 'payg' | null =
    planRaw === 'pro' ? 'pro' : planRaw === 'plus' ? 'plus' : planRaw === 'payg' ? 'payg' : null;
  if (!plan) {
    return NextResponse.json(
      { error: { message: "plan muss 'plus', 'pro' oder 'payg' sein" } },
      { status: 400 },
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mieterplus.abdullahu.de';

  // Plus/Pro: Price-ID prüfen
  if (plan !== 'payg' && !PRICE_ENV[plan]) {
    return NextResponse.json(
      {
        error: {
          message: 'Die Stripe-Price-ID für diesen Tarif ist nicht konfiguriert.',
          code: 'stripe_price_missing',
        },
      },
      { status: 503 },
    );
  }
  if (!secretKey) {
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

  // PayG-Module + Preis berechnen (server-side)
  let paygModules: PaygModules = PAYG_DEFAULT_MODULES;
  let paygCents = 0;
  if (plan === 'payg') {
    paygModules = sanitizeModules(body?.modules);
    paygCents = calcPaygPriceCents(paygModules);
    if (paygCents < 500 || paygCents > 100000) {
      return NextResponse.json(
        { error: { message: 'Pay-as-you-go-Preis außerhalb des erlaubten Bereichs.' } },
        { status: 400 },
      );
    }
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey);

    // Customer wiederverwenden/erstellen
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
      await service
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', guard.user.id);
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      plan === 'payg'
        ? [
            {
              quantity: 1,
              price_data: {
                currency: 'eur',
                recurring: { interval: 'month' },
                unit_amount: paygCents,
                product_data: {
                  name: 'Mieter+ Pay-as-you-go',
                  metadata: {
                    payg_modules_json: JSON.stringify(paygModules),
                  },
                },
              },
            },
          ]
        : [{ price: PRICE_ENV[plan]!, quantity: 1 }];

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: lineItems,
      success_url: `${appUrl}/dashboard?premium=success`,
      cancel_url: `${appUrl}/dashboard/upgrade?canceled=1`,
      client_reference_id: guard.user.id,
      subscription_data: {
        metadata: {
          user_id: guard.user.id,
          plan,
          ...(plan === 'payg' ? { payg_modules: JSON.stringify(paygModules) } : {}),
        },
      },
      metadata: {
        user_id: guard.user.id,
        plan,
        ...(plan === 'payg' ? { payg_price_cents: String(paygCents) } : {}),
      },
      allow_promotion_codes: true,
    });
    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Checkout fehlgeschlagen';
    return NextResponse.json({ error: { message: msg } }, { status: 500 });
  }
}
