import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';

const MAX_ATTEMPTS_PER_HOUR = 5;
const CODE_RE = /^[A-Z0-9]{12}$/;

function err(message: string, status: number, code?: string) {
  return NextResponse.json({ error: { message, code } }, { status });
}

async function hashIp(ipHeader: string | null): Promise<string | null> {
  if (!ipHeader) return null;
  const ip = ipHeader.split(',')[0]!.trim();
  if (!ip) return null;
  const data = new TextEncoder().encode(ip);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// CORS für die Mobile-App (Bearer-Token-Aufrufe)
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
  const service = createSupabaseServiceClient();

  // Auth: entweder Cookie-Session (Web) ODER Bearer-Token (Mobile-App)
  const authHeader = request.headers.get('authorization');
  let userId: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data } = await service.auth.getUser(token);
    userId = data.user?.id ?? null;
  } else {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }
  if (!userId) return err('Unauthorized', 401);

  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  if (profile?.role !== 'tenant') return err('Mieter-Rolle erforderlich', 403);

  // Code-Parsing
  const body = await request.json().catch(() => null);
  const rawCode = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!CODE_RE.test(rawCode)) return err('Ungültiges Code-Format', 400);

  const ipHash = await hashIp(request.headers.get('x-forwarded-for'));

  // Rate-Limit: max. 5 Versuche pro Stunde pro User
  const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: attemptCount } = await service
    .from('invitation_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gt('created_at', sinceIso);

  if ((attemptCount ?? 0) >= MAX_ATTEMPTS_PER_HOUR) {
    return err('Zu viele Versuche. Bitte in einer Stunde erneut versuchen.', 429, 'rate_limited');
  }

  const logAttempt = async (success: boolean) => {
    await service.from('invitation_attempts').insert({
      user_id: userId,
      ip_hash: ipHash,
      code_tried: rawCode.slice(0, 4) + '********',
      success,
    });
  };

  // Code prüfen
  const { data: invitation, error: invErr } = await service
    .from('tenant_invitations')
    .select('id, unit_id, expires_at, used_at')
    .eq('code', rawCode)
    .maybeSingle();

  if (invErr) {
    await logAttempt(false);
    return err(invErr.message, 500);
  }
  if (!invitation) {
    await logAttempt(false);
    return err('Code ungültig', 404, 'invalid_code');
  }
  if (invitation.used_at) {
    await logAttempt(false);
    return err('Code wurde bereits eingelöst', 409, 'already_used');
  }
  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    await logAttempt(false);
    return err('Code ist abgelaufen', 410, 'expired');
  }

  // Schon Mieter dieser Einheit?
  const { data: existing } = await service
    .from('tenancies')
    .select('id')
    .eq('tenant_id', userId)
    .eq('unit_id', invitation.unit_id)
    .is('ended_at', null)
    .maybeSingle();

  if (existing) {
    await logAttempt(false);
    return err('Du bist bereits Mieter dieser Einheit', 409, 'already_tenant');
  }

  // Tenancy erstellen
  const { data: tenancy, error: tErr } = await service
    .from('tenancies')
    .insert({ tenant_id: userId, unit_id: invitation.unit_id })
    .select('id, unit_id, started_at')
    .single();

  if (tErr) {
    await logAttempt(false);
    return err(tErr.message, 500);
  }

  // Invitation als used_at markieren
  const { error: useErr } = await service
    .from('tenant_invitations')
    .update({ used_at: new Date().toISOString(), used_by: userId })
    .eq('id', invitation.id)
    .is('used_at', null);

  if (useErr) {
    // Rollback: Tenancy wieder löschen
    await service.from('tenancies').delete().eq('id', tenancy.id);
    await logAttempt(false);
    return err('Code konnte nicht eingelöst werden', 500);
  }

  await logAttempt(true);
  // Audit-Log (Best-Effort, Fehler hier nicht durchreichen)
  await service.rpc('log_audit', {
    p_action: 'tenancy.created',
    p_entity_type: 'tenancy',
    p_entity_id: tenancy.id,
    p_payload: { unit_id: invitation.unit_id, invitation_id: invitation.id },
  }).then(() => {}, () => {});

  return NextResponse.json({ tenancy }, { status: 201 });
}
