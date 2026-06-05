import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/guards';

export const runtime = 'nodejs';

/** Vermieter löscht einen eigenen Slot (inkl. evtl. Buchung via cascade). */
export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: slotId } = await ctx.params;
  const guard = await requireRole(['landlord', 'admin']);
  if (!guard.ok) return guard.response;

  const service = createSupabaseServiceClient();
  const { data: slot } = await service
    .from('appointment_slots')
    .select('id, properties(owner_id)')
    .eq('id', slotId)
    .single();
  if (!slot) {
    return NextResponse.json({ error: { message: 'Slot nicht gefunden' } }, { status: 404 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ownerId = (slot as any).properties?.owner_id;
  if (guard.user.id !== ownerId && guard.user.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Keine Berechtigung' } }, { status: 403 });
  }

  await service.from('appointment_slots').delete().eq('id', slotId);
  return NextResponse.json({ ok: true }, { status: 200 });
}
