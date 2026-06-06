import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * Mieter bestätigt (oder lehnt ab), dass ein Mangel behoben ist.
 *
 * - action = 'confirm' → request.status: 'resolved' → 'closed' (Ticket archiviert)
 * - action = 'reject'  → request.status: 'resolved' → 'in_progress' (zurück an Vermieter)
 *
 * Läuft über Service-Client, weil die RLS-Policy für `requests UPDATE` durch
 * Mieter nur Status-Beibehaltung erlaubt. Diese Route prüft Berechtigung
 * (Mieter dieser Tenancy) selbst.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const requestId = body?.request_id;
  const action = body?.action;
  const rating =
    typeof body?.rating === 'number' && body.rating >= 1 && body.rating <= 5
      ? Math.round(body.rating)
      : null;
  const feedback =
    typeof body?.feedback === 'string' ? body.feedback.trim().slice(0, 1000) || null : null;
  if (
    typeof requestId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(requestId) ||
    !['confirm', 'reject'].includes(action)
  ) {
    return NextResponse.json(
      { error: { message: 'request_id (uuid) und action (confirm|reject) erforderlich' } },
      { status: 400 },
    );
  }

  const service = createSupabaseServiceClient();

  // Berechtigung: Ist der User der Mieter der zugehörigen Tenancy?
  const { data: req, error: reqErr } = await service
    .from('requests')
    .select('id, status, tenancy_id, tenancies(tenant_id)')
    .eq('id', requestId)
    .single();

  if (reqErr || !req) {
    return NextResponse.json(
      { error: { message: 'Mangelmeldung nicht gefunden' } },
      { status: 404 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantId = ((req as any).tenancies?.tenant_id) as string | undefined;
  if (tenantId !== user.id) {
    return NextResponse.json(
      { error: { message: 'Nur der zugehörige Mieter kann das bestätigen.' } },
      { status: 403 },
    );
  }

  if (req.status !== 'resolved') {
    return NextResponse.json(
      {
        error: {
          message: 'Bestätigung nur möglich, wenn der Vermieter den Mangel als „behoben" markiert hat.',
        },
      },
      { status: 409 },
    );
  }

  const newStatus = action === 'confirm' ? 'closed' : 'in_progress';

  // Bei Bestätigung optional Bewertung mitspeichern
  const updatePayload: Record<string, unknown> = { status: newStatus };
  if (action === 'confirm' && rating) {
    updatePayload.resolution_rating = rating;
    updatePayload.resolution_feedback = feedback;
  }

  const { error: updErr } = await service
    .from('requests')
    .update(updatePayload)
    .eq('id', requestId);

  if (updErr) {
    return NextResponse.json({ error: { message: updErr.message } }, { status: 500 });
  }

  // Audit-Log (best-effort)
  await service
    .rpc('log_audit', {
      p_action: action === 'confirm' ? 'request.closed_by_tenant' : 'request.reopened_by_tenant',
      p_entity_type: 'request',
      p_entity_id: requestId,
      p_payload: { from: 'resolved', to: newStatus, actor: user.id },
    })
    .then(
      () => {},
      () => {},
    );

  return NextResponse.json({ status: newStatus }, { status: 200 });
}
