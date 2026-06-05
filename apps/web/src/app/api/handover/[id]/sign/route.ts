import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/guards';

export const runtime = 'nodejs';

/**
 * Ein Teilnehmer (Mieter oder Vermieter) unterschreibt das Protokoll.
 * Body: { image_base64: string (PNG data URL oder base64) }
 *
 * Läuft über Service-Client, weil das Setzen von tenant_signed_at /
 * landlord_signed_at sonst an der RLS scheitert (nur Vermieter darf
 * protocol updaten). Berechtigung wird hier selbst geprüft.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: protocolId } = await ctx.params;
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const imageBase64: string | undefined = body?.image_base64;
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return NextResponse.json({ error: { message: 'Unterschrift fehlt' } }, { status: 400 });
  }

  const service = createSupabaseServiceClient();

  // Protokoll + Tenancy laden (Beziehung bestimmen)
  const { data: protocolRow } = await service
    .from('handover_protocols')
    .select('id, status, tenancy_id, tenancies(tenant_id, units(properties(owner_id)))')
    .eq('id', protocolId)
    .single();

  if (!protocolRow) {
    return NextResponse.json({ error: { message: 'Protokoll nicht gefunden' } }, { status: 404 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const protocol: any = protocolRow;
  if (protocol.status === 'completed') {
    return NextResponse.json(
      { error: { message: 'Protokoll ist bereits abgeschlossen.' } },
      { status: 409 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenancy: any = (protocol as any).tenancies;
  const tenantId = tenancy?.tenant_id;
  const ownerId = tenancy?.units?.properties?.owner_id;

  let role: 'tenant' | 'landlord' | null = null;
  if (guard.user.id === tenantId) role = 'tenant';
  else if (guard.user.id === ownerId) role = 'landlord';
  if (!role) {
    return NextResponse.json(
      { error: { message: 'Nur Mieter oder Vermieter dieses Protokolls dürfen unterschreiben.' } },
      { status: 403 },
    );
  }

  // Base64 → Buffer
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const path = `${protocolId}/signatures/${role}.png`;

  const { error: upErr } = await service.storage
    .from('handover-photos')
    .upload(path, buffer, { contentType: 'image/png', upsert: true });
  if (upErr) {
    return NextResponse.json({ error: { message: upErr.message } }, { status: 500 });
  }

  // Signatur-Datensatz (upsert auf (protocol_id, signer_role))
  await service
    .from('handover_signatures')
    .upsert(
      { protocol_id: protocolId, signer_id: guard.user.id, signer_role: role, image_path: path, signed_at: new Date().toISOString() },
      { onConflict: 'protocol_id,signer_role' },
    );

  // Zeitstempel am Protokoll setzen
  const stampField = role === 'tenant' ? 'tenant_signed_at' : 'landlord_signed_at';
  const { data: updated } = await service
    .from('handover_protocols')
    .update({ [stampField]: new Date().toISOString(), status: 'awaiting_signatures' })
    .eq('id', protocolId)
    .select('tenant_signed_at, landlord_signed_at')
    .single();

  await service
    .rpc('log_audit', {
      p_action: 'handover.signed',
      p_entity_type: 'handover_protocol',
      p_entity_id: protocolId,
      p_payload: { role, by: guard.user.id },
    })
    .then(() => {}, () => {});

  const bothSigned = Boolean(updated?.tenant_signed_at && updated?.landlord_signed_at);
  return NextResponse.json({ role, bothSigned }, { status: 200 });
}
