import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/guards';

export const runtime = 'nodejs';

/**
 * Eingeladene Person nimmt eine Hausverwaltungs-Einladung an.
 * Body: { assignment_id }
 * Prüft, dass die invite_email zur E-Mail des eingeloggten Users passt.
 */
export async function POST(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const assignmentId = body?.assignment_id;
  if (!/^[0-9a-f-]{36}$/i.test(assignmentId ?? '')) {
    return NextResponse.json({ error: { message: 'assignment_id fehlt' } }, { status: 400 });
  }

  const service = createSupabaseServiceClient();

  // E-Mail des eingeloggten Users
  const { data: authData } = await service.auth.admin.getUserById(guard.user.id);
  const myEmail = authData.user?.email?.toLowerCase();
  if (!myEmail) {
    return NextResponse.json({ error: { message: 'Keine E-Mail am Konto' } }, { status: 400 });
  }

  const { data: assignment } = await service
    .from('property_managers')
    .select('id, invite_email, status')
    .eq('id', assignmentId)
    .single();

  if (!assignment || assignment.invite_email.toLowerCase() !== myEmail) {
    return NextResponse.json(
      { error: { message: 'Einladung nicht gefunden oder nicht für dich bestimmt.' } },
      { status: 403 },
    );
  }
  if (assignment.status === 'revoked') {
    return NextResponse.json({ error: { message: 'Einladung wurde zurückgezogen.' } }, { status: 409 });
  }

  await service
    .from('property_managers')
    .update({ manager_id: guard.user.id, status: 'active', accepted_at: new Date().toISOString() })
    .eq('id', assignmentId);

  await service
    .rpc('log_audit', {
      p_action: 'property_manager.accepted',
      p_entity_type: 'property_manager',
      p_entity_id: assignmentId,
      p_payload: { manager: guard.user.id },
    })
    .then(() => {}, () => {});

  return NextResponse.json({ ok: true }, { status: 200 });
}
