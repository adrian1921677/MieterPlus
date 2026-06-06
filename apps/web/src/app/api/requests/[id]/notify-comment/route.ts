import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/guards';
import { notifyUser } from '@/lib/notify';

export const runtime = 'nodejs';

/**
 * Benachrichtigt die jeweils andere Partei über einen neuen Kommentar
 * an einem Mangel (E-Mail + Push, best-effort). Wird nach dem Absenden
 * eines Kommentars vom Client aufgerufen.
 * Body: { message?: string }
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: requestId } = await ctx.params;
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const snippet =
    typeof body?.message === 'string' ? body.message.trim().slice(0, 140) : '';

  const service = createSupabaseServiceClient();
  const { data: req } = await service
    .from('requests')
    .select('id, title, tenancy_id, tenancies(tenant_id, units(properties(owner_id)))')
    .eq('id', requestId)
    .single();
  if (!req) return NextResponse.json({ ok: false }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenancy: any = (req as any).tenancies;
  const tenantId = tenancy?.tenant_id;
  const ownerId = tenancy?.units?.properties?.owner_id;

  // Empfänger = die jeweils andere Partei
  let recipient: string | null = null;
  if (guard.user.id === tenantId) recipient = ownerId;
  else if (guard.user.id === ownerId) recipient = tenantId;
  // Sender ist nicht Teilnehmer → nichts tun (z.B. Verwalter; optional erweiterbar)
  if (!recipient || recipient === guard.user.id) {
    return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
  }

  await notifyUser(recipient, {
    title: `Neue Nachricht: ${req.title}`,
    body: snippet
      ? `Neue Nachricht zu deinem Mangel „${req.title}": ${snippet}`
      : `Es gibt eine neue Nachricht zu deinem Mangel „${req.title}".`,
    data: { type: 'request_comment', request_id: requestId },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
