import { NextResponse, type NextRequest } from 'next/server';
import { MANAGER_PERMISSIONS, PLAN_LIMITS, type SubscriptionPlan } from '@mieterplus/shared';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/guards';

export const runtime = 'nodejs';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'Mieter Plus <noreply@abdullahu.de>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mieterplus.abdullahu.de';

/**
 * Eigentümer lädt eine Hausverwaltung ein.
 * Body: { email, permissions: {requests,vault,appointments,properties}, property_ids: string[] }
 */
export async function POST(request: NextRequest) {
  const guard = await requireRole(['landlord', 'admin']);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? '').trim().toLowerCase();
  const permsIn = body?.permissions ?? {};
  const propertyIds: string[] = Array.isArray(body?.property_ids) ? body.property_ids : [];

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: { message: 'Gültige E-Mail erforderlich' } }, { status: 400 });
  }
  if (propertyIds.length === 0) {
    return NextResponse.json(
      { error: { message: 'Bitte mindestens eine Immobilie auswählen' } },
      { status: 400 },
    );
  }
  // Nur erlaubte Permission-Keys übernehmen
  const permissions: Record<string, boolean> = {};
  for (const key of MANAGER_PERMISSIONS) permissions[key] = Boolean(permsIn[key]);
  if (!Object.values(permissions).some(Boolean)) {
    return NextResponse.json(
      { error: { message: 'Bitte mindestens eine Berechtigung auswählen' } },
      { status: 400 },
    );
  }

  const service = createSupabaseServiceClient();

  // Plan-Limit für Hausverwaltungen prüfen
  if (guard.user.role !== 'admin') {
    const { data: ownerProfile } = await service
      .from('profiles')
      .select('subscription_plan, subscription_valid_until')
      .eq('id', guard.user.id)
      .single();
    const planValid =
      !ownerProfile?.subscription_valid_until ||
      new Date(ownerProfile.subscription_valid_until).getTime() > Date.now();
    const plan: SubscriptionPlan =
      planValid && (ownerProfile?.subscription_plan === 'plus' || ownerProfile?.subscription_plan === 'pro')
        ? ownerProfile.subscription_plan
        : planValid && (ownerProfile?.subscription_plan === 'trial' || ownerProfile?.subscription_plan === 'payg')
          ? ownerProfile.subscription_plan
          : 'trial';
    const limit = PLAN_LIMITS[plan].managers; // null = unbegrenzt
    if (limit !== null) {
      const { count } = await service
        .from('property_managers')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', guard.user.id)
        .neq('status', 'revoked');
      if ((count ?? 0) >= limit) {
        return NextResponse.json(
          {
            error: {
              code: 'manager_limit',
              message:
                limit === 0
                  ? 'Hausverwaltungen sind ab dem Plus-Tarif verfügbar. Bitte upgrade dein Abo.'
                  : `Dein Tarif erlaubt maximal ${limit} Hausverwaltung(en). Mit Pro sind es unbegrenzt.`,
            },
          },
          { status: 403 },
        );
      }
    }
  }

  // Sicherstellen, dass alle Properties dem Eigentümer gehören
  const { data: ownProps } = await service
    .from('properties')
    .select('id')
    .eq('owner_id', guard.user.id)
    .in('id', propertyIds);
  const validIds = (ownProps ?? []).map((p) => p.id);
  if (validIds.length === 0) {
    return NextResponse.json(
      { error: { message: 'Keine gültigen Immobilien ausgewählt' } },
      { status: 400 },
    );
  }

  // Assignment anlegen
  const { data: assignment, error: insErr } = await service
    .from('property_managers')
    .insert({
      owner_id: guard.user.id,
      invite_email: email,
      permissions,
      status: 'pending',
    })
    .select('id')
    .single();
  if (insErr || !assignment) {
    return NextResponse.json(
      { error: { message: insErr?.message ?? 'Einladung fehlgeschlagen' } },
      { status: 500 },
    );
  }

  // Property-Zuordnungen
  await service.from('property_manager_properties').insert(
    validIds.map((pid) => ({ assignment_id: assignment.id, property_id: pid })),
  );

  // Falls der Eingeladene bereits ein Konto hat → direkt verknüpfen (manager_id), bleibt aber 'pending' bis akzeptiert
  // (Erkennen wir beim Login über die E-Mail.)

  // E-Mail-Einladung (best-effort)
  if (RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(RESEND_API_KEY);
      await resend.emails.send({
        from: RESEND_FROM,
        to: email,
        subject: 'Einladung zur Hausverwaltung bei Mieter +',
        text: `Du wurdest als Hausverwaltung eingeladen. Melde dich unter ${APP_URL}/login an (oder registriere dich mit dieser E-Mail), um die Einladung anzunehmen.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin:0 auto; color:#18181b;">
            <div style="border-bottom:2px solid #2563a8; padding-bottom:12px; margin-bottom:16px;">
              <span style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#71717a;">ADB · Mieter +</span>
              <h1 style="font-size:18px; margin:6px 0 0;">Einladung zur Hausverwaltung</h1>
            </div>
            <p style="font-size:14px; line-height:1.6; color:#52525b;">
              Du wurdest eingeladen, als Hausverwaltung in Mieter + mitzuwirken. Melde dich mit
              dieser E-Mail-Adresse an oder registriere dich – die Einladung erscheint dann direkt
              in deinem Dashboard.
            </p>
            <p style="margin-top:20px;">
              <a href="${APP_URL}/login" style="display:inline-block; background:#09090b; color:#fff; text-decoration:none; padding:10px 20px; border-radius:2px; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">
                Einladung ansehen
              </a>
            </p>
          </div>`,
      });
    } catch (err) {
      console.error('[managers:invite:email]', err);
    }
  }

  await service
    .rpc('log_audit', {
      p_action: 'property_manager.invited',
      p_entity_type: 'property_manager',
      p_entity_id: assignment.id,
      p_payload: { email, properties: validIds.length },
    })
    .then(() => {}, () => {});

  return NextResponse.json({ id: assignment.id }, { status: 201 });
}
