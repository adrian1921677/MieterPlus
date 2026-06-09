import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Aufbewahrungsfrist für Ausweisdokumente (Datenminimierung, DSGVO Art. 5).
const RETENTION_DAYS = 30;

/**
 * Geplanter Job (Vercel Cron): löscht Ausweisdokumente, die älter als
 * RETENTION_DAYS sind — sowohl die DATEI im Storage als auch die DB-Zeile.
 *
 * Geschützt per CRON_SECRET (Vercel sendet `Authorization: Bearer <CRON_SECRET>`).
 * Zeitplan in vercel.json.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createSupabaseServiceClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();

  const { data: docs, error } = await service
    .from('identity_documents')
    .select('id, file_path')
    .lt('uploaded_at', cutoff);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!docs || docs.length === 0) {
    return NextResponse.json({ purged: 0 });
  }

  // 1) Dateien aus dem Storage löschen (in Batches à 100)
  const paths = docs.map((d) => d.file_path as string).filter(Boolean);
  for (let i = 0; i < paths.length; i += 100) {
    await service.storage.from('identity-documents').remove(paths.slice(i, i + 100));
  }

  // 2) DB-Zeilen löschen
  const ids = docs.map((d) => d.id as string);
  const { error: delErr } = await service.from('identity_documents').delete().in('id', ids);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // 3) Audit (best-effort)
  await service
    .rpc('log_audit', {
      p_action: 'identity_documents.purged',
      p_entity_type: 'identity_document',
      p_entity_id: ids[0],
      p_payload: { count: ids.length, retention_days: RETENTION_DAYS },
    })
    .then(() => {}, () => {});

  return NextResponse.json({ purged: ids.length });
}
