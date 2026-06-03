// Edge Function: review-property
// POST /functions/v1/review-property
// Body: { property_id: uuid, decision: 'verified' | 'rejected', reason?: string }
// Auth: Admin
// Setzt ownership_status & schreibt Audit-Log.

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, getUserFromAuthHeader } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const auth = await getUserFromAuthHeader(req);
    if (!auth) return errorResponse('Unauthorized', 401);
    if (auth.role !== 'admin') return errorResponse('Admin-Rolle erforderlich', 403);

    const body = await req.json().catch(() => null);
    const propertyId = body?.property_id;
    const decision = body?.decision;
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 2000) : null;

    if (typeof propertyId !== 'string' || !/^[0-9a-f-]{36}$/i.test(propertyId)) {
      return errorResponse('property_id (uuid) erforderlich', 400);
    }
    if (decision !== 'verified' && decision !== 'rejected') {
      return errorResponse('decision muss "verified" oder "rejected" sein', 400);
    }
    if (decision === 'rejected' && (!reason || reason.length < 5)) {
      return errorResponse('Bei Ablehnung ist eine Begründung Pflicht', 400);
    }

    const service = getServiceClient();

    const { data: existing, error: exErr } = await service
      .from('properties')
      .select('id, ownership_status')
      .eq('id', propertyId)
      .maybeSingle();

    if (exErr) return errorResponse(exErr.message, 500);
    if (!existing) return errorResponse('Property nicht gefunden', 404);
    if (existing.ownership_status !== 'pending') {
      return errorResponse(
        `Property ist bereits ${existing.ownership_status}`,
        409,
      );
    }

    const { data: updated, error: upErr } = await service
      .from('properties')
      .update({
        ownership_status: decision,
        verified_at: decision === 'verified' ? new Date().toISOString() : null,
        verified_by: auth.userId,
        rejection_reason: decision === 'rejected' ? reason : null,
      })
      .eq('id', propertyId)
      .select('id, ownership_status, verified_at, verified_by, rejection_reason')
      .single();

    if (upErr) return errorResponse(upErr.message, 500);

    await service.rpc('log_audit', {
      p_action: `property.${decision}`,
      p_entity_type: 'property',
      p_entity_id: propertyId,
      p_payload: { reason },
    });

    return jsonResponse({ property: updated });
  } catch (err) {
    console.error('review-property error', err);
    return errorResponse('Interner Fehler', 500);
  }
});
