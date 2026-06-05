import 'server-only';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { computeIsPremium } from '@/lib/subscription';

export type GuardUser = {
  id: string;
  role: 'tenant' | 'landlord' | 'admin';
  isPremium: boolean;
};

type GuardOk = { ok: true; user: GuardUser };
type GuardFail = { ok: false; response: NextResponse };
export type GuardResult = GuardOk | GuardFail;

function fail(message: string, status: number, code?: string): GuardFail {
  return { ok: false, response: NextResponse.json({ error: { message, code } }, { status }) };
}

/**
 * Lädt den eingeloggten User + sein Profil (Rolle, Abo).
 * Gibt bei fehlendem Login eine fertige 401-Response zurück.
 */
export async function requireUser(): Promise<GuardResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Nicht angemeldet.', 401, 'unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, subscription_plan, subscription_valid_until')
    .eq('id', user.id)
    .single();

  if (!profile) return fail('Profil nicht gefunden.', 401, 'no_profile');

  return {
    ok: true,
    user: {
      id: user.id,
      role: profile.role,
      isPremium: computeIsPremium(profile.subscription_plan, profile.subscription_valid_until),
    },
  };
}

/**
 * Wie requireUser, verlangt aber eine bestimmte Rolle.
 */
export async function requireRole(
  roles: Array<'tenant' | 'landlord' | 'admin'>,
): Promise<GuardResult> {
  const res = await requireUser();
  if (!res.ok) return res;
  if (!roles.includes(res.user.role)) {
    return fail('Keine Berechtigung für diese Aktion.', 403, 'forbidden');
  }
  return res;
}

/**
 * Verlangt einen Vermieter (oder Admin) MIT aktivem Premium-Abo.
 * Admins sind immer durchgelassen (für Support/Tests).
 * Bei Vermieter ohne Premium → 403 premium_required.
 */
export async function requirePremium(): Promise<GuardResult> {
  const res = await requireRole(['landlord', 'admin']);
  if (!res.ok) return res;
  if (res.user.role === 'admin') return res; // Admin-Bypass
  if (!res.user.isPremium) {
    return fail(
      'Dieses Feature ist Teil von Mieter + Premium. Bitte upgrade dein Abo.',
      403,
      'premium_required',
    );
  }
  return res;
}
