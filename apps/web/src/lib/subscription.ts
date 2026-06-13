import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from '@mieterplus/shared';

export type SubscriptionInfo = {
  plan: SubscriptionPlan;
  validUntil: string | null;
  isPremium: boolean;
};

/**
 * Lädt den Abo-Status eines Users und berechnet, ob Premium aktiv ist.
 * Premium aktiv = trial/plus/pro/payg UND (kein Ablaufdatum ODER Ablaufdatum in der Zukunft).
 */
export async function getSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionInfo> {
  const { data } = await supabase
    .from('profiles')
    .select('subscription_plan, subscription_valid_until')
    .eq('id', userId)
    .single();

  const raw = data?.subscription_plan as string | null;
  const plan: SubscriptionPlan =
    raw && (SUBSCRIPTION_PLANS as readonly string[]).includes(raw)
      ? (raw as SubscriptionPlan)
      : 'trial';
  const validUntil: string | null = data?.subscription_valid_until ?? null;
  return { plan, validUntil, isPremium: computeIsPremium(plan, validUntil) };
}

/** Reine Berechnung, ob ein bezahlter Plan (trial/plus/pro/payg) aktuell aktiv ist. */
export function computeIsPremium(
  plan: string | null | undefined,
  validUntil: string | null | undefined,
): boolean {
  if (!plan || !(SUBSCRIPTION_PLANS as readonly string[]).includes(plan)) return false;
  if (!validUntil) return true;
  return new Date(validUntil).getTime() > Date.now();
}

