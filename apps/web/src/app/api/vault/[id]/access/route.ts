import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/guards';

export const runtime = 'nodejs';

/**
 * Liefert eine signierte URL zum Öffnen/Download eines Tresor-Dokuments und
 * protokolliert den Zugriff (Lesebestätigung).
 * Body: { action?: 'viewed' | 'downloaded' } (default 'viewed')
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await ctx.params;
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const action = body?.action === 'downloaded' ? 'downloaded' : 'viewed';

  const service = createSupabaseServiceClient();

  const { data: doc } = await service
    .from('vault_documents')
    .select('id, property_id, file_path, visible_to_tenant, title, properties(owner_id)')
    .eq('id', documentId)
    .single();

  if (!doc) {
    return NextResponse.json({ error: { message: 'Dokument nicht gefunden' } }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ownerId = (doc as any).properties?.owner_id;
  const isOwner = guard.user.id === ownerId;

  // Mieter-Zugriff prüfen (aktive Tenancy in der Property + Freigabe)
  let isAllowedTenant = false;
  if (!isOwner && doc.visible_to_tenant) {
    const { data: tenancy } = await service
      .from('tenancies')
      .select('id, units!inner(property_id)')
      .eq('tenant_id', guard.user.id)
      .is('ended_at', null)
      .eq('units.property_id', doc.property_id)
      .maybeSingle();
    isAllowedTenant = Boolean(tenancy);
  }

  if (!isOwner && !isAllowedTenant && guard.user.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Kein Zugriff' } }, { status: 403 });
  }

  // Zugriff protokollieren — nur wenn NICHT der Eigentümer (Lesebestätigung des Mieters)
  if (!isOwner) {
    await service.from('document_access_log').insert({
      document_id: documentId,
      viewer_id: guard.user.id,
      action,
    });
  }

  const { data: signed } = await service.storage
    .from('document-vault')
    .createSignedUrl(doc.file_path, 300);

  return NextResponse.json({ url: signed?.signedUrl ?? null, title: doc.title }, { status: 200 });
}
