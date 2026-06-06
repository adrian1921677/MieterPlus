import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/guards';

export const runtime = 'nodejs';

/** Eigentümer zieht eine Hausverwaltungs-Zuweisung zurück (oder löscht eine offene Einladung). */
export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const guard = await requireRole(['landlord', 'admin']);
  if (!guard.ok) return guard.response;

  const service = createSupabaseServiceClient();
  const { data: assignment } = await service
    .from('property_managers')
    .select('id, owner_id, status')
    .eq('id', id)
    .single();
  if (!assignment) {
    return NextResponse.json({ error: { message: 'Nicht gefunden' } }, { status: 404 });
  }
  if (assignment.owner_id !== guard.user.id && guard.user.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Keine Berechtigung' } }, { status: 403 });
  }

  if (assignment.status === 'pending') {
    // Offene Einladung komplett löschen
    await service.from('property_managers').delete().eq('id', id);
  } else {
    await service.from('property_managers').update({ status: 'revoked' }).eq('id', id);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
