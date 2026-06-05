import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/guards';

export const runtime = 'nodejs';

/** Vermieter löscht ein eigenes Tresor-Dokument (inkl. Storage-Objekt). */
export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await ctx.params;
  const guard = await requireRole(['landlord', 'admin']);
  if (!guard.ok) return guard.response;

  const service = createSupabaseServiceClient();
  const { data: doc } = await service
    .from('vault_documents')
    .select('id, file_path, property_id, properties(owner_id)')
    .eq('id', documentId)
    .single();
  if (!doc) {
    return NextResponse.json({ error: { message: 'Dokument nicht gefunden' } }, { status: 404 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ownerId = (doc as any).properties?.owner_id;
  if (guard.user.id !== ownerId && guard.user.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Keine Berechtigung' } }, { status: 403 });
  }

  await service.storage.from('document-vault').remove([doc.file_path]);
  await service.from('vault_documents').delete().eq('id', documentId);

  return NextResponse.json({ ok: true }, { status: 200 });
}
