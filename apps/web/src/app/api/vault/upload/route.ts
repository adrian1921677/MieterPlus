import { NextResponse, type NextRequest } from 'next/server';
import {
  VAULT_DOCUMENT_TYPES,
  PLAN_LIMITS,
  VAULT_ALLOWED_MIME_TYPES,
  VAULT_MAX_FILE_SIZE_BYTES,
  type SubscriptionPlan,
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

  // Property gehört dem Vermieter ODER User ist Hausverwaltung mit 'vault'-Recht?
  const { data: property } = await service
    .from('properties')
    .select('id, owner_id')
    .eq('id', propertyId)
    .single();
  if (!property) {
    return NextResponse.json({ error: { message: 'Immobilie nicht gefunden' } }, { status: 404 });
  }

  const isOwner = property.owner_id === guard.user.id;
  let isManagerWithVault = false;
  if (!isOwner && guard.user.role !== 'admin') {
    const { data: mgr } = await service
      .from('property_managers')
      .select('permissions, property_manager_properties!inner(property_id)')
      .eq('manager_id', guard.user.id)
      .eq('status', 'active')
      .eq('property_manager_properties.property_id', propertyId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isManagerWithVault = (mgr ?? []).some((m: any) => m.permissions?.vault === true);
  }
  if (!isOwner && !isManagerWithVault && guard.user.role !== 'admin') {
    return NextResponse.json(
      { error: { message: 'Keine Berechtigung für diese Immobilie' } },
      { status: 403 },
    );
  }

  // Quota-Check: zählt zum Kontingent des EIGENTÜMERS
  const ownerId = property.owner_id;
  const { data: ownerProfile } = await service
    .from('profiles')
    .select('subscription_plan, subscription_valid_until')
    .eq('id', ownerId)
    .single();
  const planValid =
    !ownerProfile?.subscription_valid_until ||
    new Date(ownerProfile.subscription_valid_until).getTime() > Date.now();
  const ownerPlan: SubscriptionPlan =
    planValid && (ownerProfile?.subscription_plan === 'plus' || ownerProfile?.subscription_plan === 'pro')
      ? ownerProfile.subscription_plan
      : 'free';
  const { data: ownerProps } = await service
    .from('properties')
    .select('id')
    .eq('owner_id', ownerId);
  const propIds = (ownerProps ?? []).map((p) => p.id);
  const { count } = await service
    .from('vault_documents')
    .select('id', { count: 'exact', head: true })
    .in('property_id', propIds.length ? propIds : [propertyId]);

  const quota = PLAN_LIMITS[ownerPlan].vaultDocs;
  if (guard.user.role !== 'admin' && (count ?? 0) >= quota) {
    return NextResponse.json(
      {
        error: {
          code: 'quota_exceeded',
          message:
            ownerPlan === 'trial'
              ? `Dein Test-Kontingent von ${quota} Dokumenten ist erreicht. Mit Plus sind ${PLAN_LIMITS.plus.vaultDocs} möglich.`
              : `Das Dokumenten-Kontingent (${quota}) ist erreicht.`,
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
