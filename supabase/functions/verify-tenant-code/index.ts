// Edge Function: verify-tenant-code
// POST /functions/v1/verify-tenant-code
// Body: { code: "ABCD1234EFGH" }
// Auth: Mieter (role = 'tenant')
// Prüft Code → erstellt Tenancy → markiert Code als eingelöst.
// Rate-Limit: max. 5 Versuche pro User pro Stunde.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, getUserFromAuthHeader, hashIp } from '../_shared/supabase.ts';

const MAX_ATTEMPTS_PER_HOUR = 5;
const CODE_RE = /^[A-Z0-9]{12}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const auth = await getUserFromAuthHeader(req);
    if (!auth) return errorResponse('Unauthorized', 401);
    if (auth.role !== 'tenant') return errorResponse('Mieter-Rolle erforderlich', 403);

    const body = await req.json().catch(() => null);
    const rawCode = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!CODE_RE.test(rawCode)) return errorResponse('Ungültiges Code-Format', 400);

    const ipHash = await hashIp(req.headers.get('x-forwarded-for'));
    const service = getServiceClient();

    const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: attemptCount } = await service
      .from('invitation_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId)
      .gt('created_at', sinceIso);

    if ((attemptCount ?? 0) >= MAX_ATTEMPTS_PER_HOUR) {
      return errorResponse(
        `Zu viele Versuche. Bitte in einer Stunde erneut versuchen.`,
        429,
        'rate_limited',
      );
    }

    const logAttempt = async (success: boolean) => {
      await service.from('invitation_attempts').insert({
        user_id: auth.userId,
        ip_hash: ipHash,
        code_tried: rawCode.slice(0, 4) + '********',
        success,
      });
    };

    const { data: invitation, error: invErr } = await service
      .from('tenant_invitations')
      .select('id, unit_id, expires_at, used_at')
      .eq('code', rawCode)
      .maybeSingle();

    if (invErr) {
      await logAttempt(false);
      return errorResponse(invErr.message, 500);
    }
    if (!invitation) {
      await logAttempt(false);
      return errorResponse('Code ungültig', 404, 'invalid_code');
    }
    if (invitation.used_at) {
      await logAttempt(false);
      return errorResponse('Code wurde bereits eingelöst', 409, 'already_used');
    }
    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      await logAttempt(false);
      return errorResponse('Code ist abgelaufen', 410, 'expired');
    }

    const { data: existing } = await service
      .from('tenancies')
      .select('id')
      .eq('tenant_id', auth.userId)
      .eq('unit_id', invitation.unit_id)
      .is('ended_at', null)
      .maybeSingle();

    if (existing) {
      await logAttempt(false);
      return errorResponse('Du bist bereits Mieter dieser Einheit', 409, 'already_tenant');
    }

    const { data: tenancy, error: tErr } = await service
      .from('tenancies')
      .insert({ tenant_id: auth.userId, unit_id: invitation.unit_id })
      .select('id, unit_id, started_at')
      .single();

    if (tErr) {
      await logAttempt(false);
      return errorResponse(tErr.message, 500);
    }

    const { error: useErr } = await service
      .from('tenant_invitations')
      .update({ used_at: new Date().toISOString(), used_by: auth.userId })
      .eq('id', invitation.id)
      .is('used_at', null);

    if (useErr) {
      await service.from('tenancies').delete().eq('id', tenancy.id);
      await logAttempt(false);
      return errorResponse('Code konnte nicht eingelöst werden', 500);
    }

    await logAttempt(true);
    await service.rpc('log_audit', {
      p_action: 'tenancy.created',
      p_entity_type: 'tenancy',
      p_entity_id: tenancy.id,
      p_payload: { unit_id: invitation.unit_id, invitation_id: invitation.id },
    });

    return jsonResponse({ tenancy }, 201);
  } catch (err) {
    console.error('verify-tenant-code error', err);
    return errorResponse('Interner Fehler', 500);
  }
});
