import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  HANDOVER_TYPE_LABELS_DE,
  HANDOVER_METER_LABELS_DE,
  type HandoverType,
} from '@mieterplus/shared';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HandoverSignatures } from './signature-section';

export const metadata = { title: 'Übergabeprotokoll' };

export default async function HandoverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = createSupabaseServiceClient();
  const { data: protocolRow } = await service
    .from('handover_protocols')
    .select(
      'id, type, status, created_at, meter_readings, keys, general_notes, pdf_path, tenant_signed_at, landlord_signed_at, ' +
        'tenancies(tenant_id, profiles:tenant_id(full_name), units(unit_label, properties(street, house_number, postal_code, city, owner_id, profiles:owner_id(full_name))))',
    )
    .eq('id', id)
    .single();

  if (!protocolRow) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const protocol: any = protocolRow;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenancy: any = (protocol as any).tenancies;
  const prop = tenancy?.units?.properties;
  const ownerId = prop?.owner_id;
  const tenantId = tenancy?.tenant_id;
  const isLandlord = user.id === ownerId;
  const isTenant = user.id === tenantId;
  if (!isLandlord && !isTenant) notFound();

  const { data: rooms } = await service
    .from('handover_rooms')
    .select('id, room_label, notes, handover_photos(id, file_path)')
    .eq('protocol_id', id)
    .order('sort_order');

  // Signierte URLs für Fotos
  const roomData = await Promise.all(
    (rooms ?? []).map(async (r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const photos: any[] = (r as any).handover_photos ?? [];
      const urls = await Promise.all(
        photos.map(async (p) => {
          const { data } = await service.storage
            .from('handover-photos')
            .createSignedUrl(p.file_path, 600);
          return data?.signedUrl ?? null;
        }),
      );
      return {
        id: r.id,
        label: r.room_label,
        notes: r.notes,
        photos: urls.filter((u): u is string => Boolean(u)),
      };
    }),
  );

  const meters = (protocol.meter_readings ?? {}) as Record<
    string,
    { value?: string; meter_no?: string }
  >;
  const keys = (protocol.keys ?? []) as { label: string; count: number }[];

  let pdfUrl: string | null = null;
  if (protocol.pdf_path) {
    const { data } = await service.storage
      .from('handover-pdfs')
      .createSignedUrl(protocol.pdf_path, 600);
    pdfUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/dashboard/handover">
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">
            Übergabeprotokoll — {HANDOVER_TYPE_LABELS_DE[protocol.type as HandoverType]}
          </h1>
          {protocol.status === 'completed' ? (
            <Badge variant="success">Abgeschlossen</Badge>
          ) : (
            <Badge variant="info">Wartet auf Unterschriften</Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {prop ? `${prop.street} ${prop.house_number}, ${prop.postal_code} ${prop.city}` : ''}
          {tenancy?.units?.unit_label ? ` · ${tenancy.units.unit_label}` : ''} · Mieter:{' '}
          {tenancy?.profiles?.full_name ?? '—'}
        </p>
      </div>

      {/* Zählerstände */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zählerstände</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {(['electricity', 'water', 'gas'] as const).map((k) => (
            <div key={k} className="flex justify-between border-b border-zinc-100 py-1.5 last:border-0">
              <span className="text-muted-foreground">{HANDOVER_METER_LABELS_DE[k]}</span>
              <span className="font-medium">
                {meters[k]?.value || '—'}
                {meters[k]?.meter_no ? ` (Nr. ${meters[k]?.meter_no})` : ''}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Schlüssel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schlüssel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {keys.length === 0 ? (
            <p className="text-muted-foreground">Keine Schlüssel erfasst.</p>
          ) : (
            keys.map((k, i) => (
              <div key={i} className="flex justify-between border-b border-zinc-100 py-1.5 last:border-0">
                <span className="text-muted-foreground">{k.label}</span>
                <span className="font-medium">{k.count} Stück</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Räume */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Räume &amp; Zustand</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {roomData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Räume dokumentiert.</p>
          ) : (
            roomData.map((room) => (
              <div key={room.id} className="rounded-md border border-zinc-200 p-4">
                <div className="font-semibold">{room.label}</div>
                {room.notes ? (
                  <p className="mt-1 text-sm text-muted-foreground">{room.notes}</p>
                ) : null}
                {room.photos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {room.photos.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-20 w-20 overflow-hidden rounded border bg-muted"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {protocol.general_notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anmerkungen</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{protocol.general_notes}</CardContent>
        </Card>
      ) : null}

      {/* Unterschriften + Abschluss */}
      <HandoverSignatures
        protocolId={protocol.id}
        status={protocol.status}
        isLandlord={isLandlord}
        isTenant={isTenant}
        tenantSignedAt={protocol.tenant_signed_at}
        landlordSignedAt={protocol.landlord_signed_at}
        tenantName={tenancy?.profiles?.full_name ?? 'Mieter'}
        landlordName={prop?.profiles?.full_name ?? 'Vermieter'}
        pdfUrl={pdfUrl}
      />
    </div>
  );
}
