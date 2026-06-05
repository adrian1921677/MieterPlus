import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionPlan } from '@mieterplus/shared';

export type SubscriptionInfo = {
  plan: SubscriptionPlan;
  validUntil: string | null;
  isPremium: boolean;
};

/**
 * Lädt den Abo-Status eines Users und berechnet, ob Premium aktiv ist.
 * "Premium aktiv" = plan==='premium' UND (kein Ablaufdatum ODER Ablaufdatum in der Zukunft).
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

  const plan: SubscriptionPlan = data?.subscription_plan === 'premium' ? 'premium' : 'basic';
  const validUntil: string | null = data?.subscription_valid_until ?? null;
  return { plan, validUntil, isPremium: computeIsPremium(plan, validUntil) };
}

/** Reine Berechnung, ob ein Plan + Ablaufdatum aktuell Premium bedeutet. */
export function computeIsPremium(
  plan: string | null | undefined,
  validUntil: string | null | undefined,
): boolean {
  if (plan !== 'premium') return false;
  if (!validUntil) return true;
  return new Date(validUntil).getTime() > Date.now();
}
