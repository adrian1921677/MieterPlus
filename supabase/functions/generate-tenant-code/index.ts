// Edge Function: generate-tenant-code
// POST /functions/v1/generate-tenant-code
// Body: { unit_id: uuid }
// Auth: Vermieter (Owner der Property zu der Unit)
// Erzeugt einen kryptografisch sicheren 12-stelligen Code (A-Z, 0-9),
// einmalig nutzbar, gültig 30 Tage.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, getUserFromAuthHeader } from '../_shared/supabase.ts';

const CODE_LENGTH = 12;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne I,O,0,1 für Lesbarkeit
const EXPIRES_DAYS = 30;
const MAX_ACTIVE_PER_UNIT = 5;

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const auth = await getUserFromAuthHeader(req);
    if (!auth) return errorResponse('Unauthorized', 401);
    if (auth.role !== 'landlord') return errorResponse('Vermieter-Rolle erforderlich', 403);

    const body = await req.json().catch(() => null);
    const unitId = body?.unit_id;
    if (typeof unitId !== 'string' || !/^[0-9a-f-]{36}$/i.test(unitId)) {
      return errorResponse('unit_id (uuid) erforderlich', 400);
    }

    const service = getServiceClient();

    const { data: unit, error: unitErr } = await service
      .from('units')
      .select('id, property_id, properties:property_id (owner_id, ownership_status)')
      .eq('id', unitId)
      .maybeSingle();

    if (unitErr) return errorResponse(unitErr.message, 500);
    if (!unit) return errorResponse('Unit nicht gefunden', 404);

    // deno-lint-ignore no-explicit-any
    const prop: any = (unit as any).properties;
    if (!prop || prop.owner_id !== auth.userId) {
      return errorResponse('Keine Berechtigung für diese Unit', 403);
    }
    if (prop.ownership_status !== 'verified') {
      return errorResponse('Property muss verifiziert sein, bevor Codes erstellt werden können', 409);
    }

    const { count } = await service
      .from('tenant_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('unit_id', unitId)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString());

    if ((count ?? 0) >= MAX_ACTIVE_PER_UNIT) {
      return errorResponse(
        `Maximal ${MAX_ACTIVE_PER_UNIT} aktive Codes pro Unit erlaubt. Bestehende Codes ablaufen lassen oder einlösen.`,
        429,
      );
    }

    let code = '';
    let inserted = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateCode();
      const expiresAt = new Date(Date.now() + EXPIRES_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await service
        .from('tenant_invitations')
        .insert({
          unit_id: unitId,
          code,
          created_by: auth.userId,
          expires_at: expiresAt,
        })
        .select('id, code, expires_at, unit_id, created_at')
        .single();
      if (!error) {
        inserted = data;
        break;
      }
      if (error.code !== '23505') {
        return errorResponse(error.message, 500);
      }
    }
    if (!inserted) return errorResponse('Code-Generierung fehlgeschlagen', 500);

    await service.rpc('log_audit', {
      p_action: 'tenant_invitation.created',
      p_entity_type: 'tenant_invitation',
      p_entity_id: inserted.id,
      p_payload: { unit_id: unitId },
    });

    return jsonResponse({ invitation: inserted }, 201);
  } catch (err) {
    console.error('generate-tenant-code error', err);
    return errorResponse('Interner Fehler', 500);
  }
});
