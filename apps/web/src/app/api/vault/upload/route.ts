import { NextResponse, type NextRequest } from 'next/server';
import {
  VAULT_DOCUMENT_TYPES,
  VAULT_QUOTA,
  VAULT_ALLOWED_MIME_TYPES,
  VAULT_MAX_FILE_SIZE_BYTES,
} from '@mieterplus/shared';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/guards';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Vermieter lädt ein Dokument in den Tresor.
 * multipart/form-data: file, property_id, type, title, visible_to_tenant
 *
 * Quota: Basic 5, Premium 200 (über alle Immobilien des Vermieters).
 */
export async function POST(request: NextRequest) {
  const guard = await requireRole(['landlord', 'admin']);
  if (!guard.ok) return guard.response;

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: { message: 'Ungültige Anfrage' } }, { status: 400 });
  }
  const file = form.get('file');
  const propertyId = String(form.get('property_id') ?? '');
  const type = String(form.get('type') ?? '');
  const title = String(form.get('title') ?? '').trim();
  const visibleToTenant = String(form.get('visible_to_tenant') ?? 'true') === 'true';

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: { message: 'Datei fehlt' } }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(propertyId)) {
    return NextResponse.json({ error: { message: 'property_id fehlt' } }, { status: 400 });
  }
  if (!(VAULT_DOCUMENT_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: { message: 'Ungültiger Dokumenttyp' } }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: { message: 'Titel fehlt' } }, { status: 400 });
  }
  if (file.size > VAULT_MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: { message: 'Datei größer als 20 MB' } }, { status: 400 });
  }
  if (!(VAULT_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { error: { message: `Format nicht erlaubt (${file.type})` } },
      { status: 400 },
    );
  }

  const service = createSupabaseServiceClient();

  // Property gehört dem Vermieter?
  const { data: property } = await service
    .from('properties')
    .select('id, owner_id')
    .eq('id', propertyId)
    .single();
  if (!property || (guard.user.role !== 'admin' && property.owner_id !== guard.user.id)) {
    return NextResponse.json(
      { error: { message: 'Keine Berechtigung für diese Immobilie' } },
      { status: 403 },
    );
  }

  // Quota-Check: Dokumente über alle Immobilien dieses Vermieters
  const ownerId = property.owner_id;
  const { data: ownerProps } = await service
    .from('properties')
    .select('id')
    .eq('owner_id', ownerId);
  const propIds = (ownerProps ?? []).map((p) => p.id);
  const { count } = await service
    .from('vault_documents')
    .select('id', { count: 'exact', head: true })
    .in('property_id', propIds.length ? propIds : [propertyId]);

  const quota = guard.user.isPremium ? VAULT_QUOTA.premium : VAULT_QUOTA.basic;
  if (guard.user.role !== 'admin' && (count ?? 0) >= quota) {
    return NextResponse.json(
      {
        error: {
          code: 'quota_exceeded',
          message: guard.user.isPremium
            ? `Dein Premium-Kontingent von ${quota} Dokumenten ist erreicht.`
            : `Dein Basic-Kontingent von ${quota} Dokumenten ist erreicht. Mit Premium erhältst du ${VAULT_QUOTA.premium} Dokumente.`,
        },
      },
      { status: 403 },
    );
  }

  // Upload
  const ext = (file.type.split('/')[1] ?? 'bin').replace('jpeg', 'jpg');
  const path = `${propertyId}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await service.storage
    .from('document-vault')
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (upErr) {
    return NextResponse.json({ error: { message: upErr.message } }, { status: 500 });
  }

  const { data: doc, error: insErr } = await service
    .from('vault_documents')
    .insert({
      property_id: propertyId,
      uploaded_by: guard.user.id,
      type,
      title,
      file_path: path,
      mime_type: file.type,
      visible_to_tenant: visibleToTenant,
    })
    .select('id')
    .single();
  if (insErr) {
    await service.storage.from('document-vault').remove([path]);
    return NextResponse.json({ error: { message: insErr.message } }, { status: 500 });
  }

  await service
    .rpc('log_audit', {
      p_action: 'vault_document.uploaded',
      p_entity_type: 'vault_document',
      p_entity_id: doc.id,
      p_payload: { property_id: propertyId, type },
    })
    .then(() => {}, () => {});

  return NextResponse.json({ id: doc.id }, { status: 201 });
}
