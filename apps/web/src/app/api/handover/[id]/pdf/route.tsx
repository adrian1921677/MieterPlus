import { NextResponse, type NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/guards';
import { HandoverDocument, type HandoverPdfData } from '@/lib/pdf/handover-document';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Generiert das finale PDF, sobald beide Parteien unterschrieben haben.
 * Nur der Vermieter (oder Admin) darf abschließen. Schreibgeschützt: ist
 * das Protokoll schon 'completed', wird nur die bestehende PDF-URL geliefert.
 */
export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: protocolId } = await ctx.params;
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const service = createSupabaseServiceClient();

  const { data: protocolRow } = await service
    .from('handover_protocols')
    .select(
      'id, type, status, created_at, meter_readings, keys, general_notes, pdf_path, tenant_signed_at, landlord_signed_at, ' +
        'tenancies(tenant_id, profiles:tenant_id(full_name), units(unit_label, properties(street, house_number, postal_code, city, owner_id, profiles:owner_id(full_name))))',
    )
    .eq('id', protocolId)
    .single();

  if (!protocolRow) {
    return NextResponse.json({ error: { message: 'Protokoll nicht gefunden' } }, { status: 404 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const protocol: any = protocolRow;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenancy: any = (protocol as any).tenancies;
  const ownerId = tenancy?.units?.properties?.owner_id;
  const tenantId = tenancy?.tenant_id;
  const isParticipant = guard.user.id === ownerId || guard.user.id === tenantId;
  if (!isParticipant && guard.user.role !== 'admin') {
    return NextResponse.json({ error: { message: 'Keine Berechtigung' } }, { status: 403 });
  }
  // Abschließen darf nur Vermieter/Admin
  if (guard.user.id !== ownerId && guard.user.role !== 'admin') {
    return NextResponse.json(
      { error: { message: 'Nur der Vermieter kann das Protokoll abschließen.' } },
      { status: 403 },
    );
  }

  if (!protocol.tenant_signed_at || !protocol.landlord_signed_at) {
    return NextResponse.json(
      { error: { message: 'Beide Parteien müssen zuerst unterschreiben.', code: 'not_signed' } },
      { status: 409 },
    );
  }

  // Räume + Fotos laden
  const { data: rooms } = await service
    .from('handover_rooms')
    .select('id, room_label, notes, sort_order, handover_photos(file_path, caption)')
    .eq('protocol_id', protocolId)
    .order('sort_order');

  // Signatur-Pfade
  const { data: signatures } = await service
    .from('handover_signatures')
    .select('signer_role, image_path')
    .eq('protocol_id', protocolId);

  // Helper: signierte URL (10 Min) für react-pdf Image
  const signedUrl = async (bucket: string, path: string): Promise<string | null> => {
    const { data } = await service.storage.from(bucket).createSignedUrl(path, 600);
    return data?.signedUrl ?? null;
  };

  const tenantSig = signatures?.find((s) => s.signer_role === 'tenant');
  const landlordSig = signatures?.find((s) => s.signer_role === 'landlord');

  const roomsData = await Promise.all(
    (rooms ?? []).map(async (r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const photos: any[] = (r as any).handover_photos ?? [];
      const photoUrls = (
        await Promise.all(photos.map((p) => signedUrl('handover-photos', p.file_path)))
      ).filter((u): u is string => Boolean(u));
      return { label: r.room_label, notes: r.notes ?? '', photoUrls };
    }),
  );

  const prop = tenancy?.units?.properties;
  const pdfData: HandoverPdfData = {
    type: protocol.type,
    createdAt: protocol.created_at,
    address: prop ? `${prop.street} ${prop.house_number}, ${prop.postal_code} ${prop.city}` : '—',
    unitLabel: tenancy?.units?.unit_label ?? '',
    tenantName: tenancy?.profiles?.full_name ?? 'Mieter',
    landlordName: prop?.profiles?.full_name ?? 'Vermieter',
    meterReadings: (protocol.meter_readings as Record<string, { value?: string; meter_no?: string }>) ?? {},
    keys: (protocol.keys as { label: string; count: number }[]) ?? [],
    generalNotes: protocol.general_notes ?? '',
    rooms: roomsData,
    tenantSignatureUrl: tenantSig ? await signedUrl('handover-photos', tenantSig.image_path) : null,
    landlordSignatureUrl: landlordSig ? await signedUrl('handover-photos', landlordSig.image_path) : null,
    tenantSignedAt: protocol.tenant_signed_at,
    landlordSignedAt: protocol.landlord_signed_at,
  };

  // PDF rendern
  const buffer = await renderToBuffer(<HandoverDocument data={pdfData} />);
  const pdfPath = `${protocolId}/protokoll.pdf`;
  const { error: upErr } = await service.storage
    .from('handover-pdfs')
    .upload(pdfPath, buffer, { contentType: 'application/pdf', upsert: true });
  if (upErr) {
    return NextResponse.json({ error: { message: upErr.message } }, { status: 500 });
  }

  await service
    .from('handover_protocols')
    .update({ pdf_path: pdfPath, status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', protocolId);

  await service
    .rpc('log_audit', {
      p_action: 'handover.completed',
      p_entity_type: 'handover_protocol',
      p_entity_id: protocolId,
      p_payload: { by: guard.user.id },
    })
    .then(() => {}, () => {});

  const { data: dl } = await service.storage.from('handover-pdfs').createSignedUrl(pdfPath, 600);
  return NextResponse.json({ pdf_url: dl?.signedUrl ?? null }, { status: 200 });
}
