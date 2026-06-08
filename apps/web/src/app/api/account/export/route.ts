import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/guards';

export const runtime = 'nodejs';

/**
 * DSGVO Art. 15 — Datenauskunft.
 * Liefert die zur eingeloggten Person gespeicherten Daten als JSON-Download.
 */
export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const userId = guard.user.id;
  const service = createSupabaseServiceClient();

  // Hilfsfunktion: Query best-effort ausführen (fehlende Tabellen/Spalten ignorieren)
  async function safe<T>(p: PromiseLike<{ data: T | null }>): Promise<T | []> {
    try {
      const { data } = await p;
      return (data ?? []) as T;
    } catch {
      return [];
    }
  }

  const [profile, tenancies, requestsAuthored, comments, bookings, subscriptionEvents, ownedProperties] =
    await Promise.all([
      safe(service.from('profiles').select('*').eq('id', userId).single() as never),
      safe(
        service
          .from('tenancies')
          .select('id, started_at, ended_at, unit:units(unit_label, property:properties(street, house_number, postal_code, city))')
          .eq('tenant_id', userId),
      ),
      safe(service.from('requests').select('*').eq('created_by', userId)),
      safe(service.from('request_comments').select('id, request_id, body, created_at').eq('author_id', userId)),
      safe(service.from('appointment_bookings').select('*').eq('tenant_id', userId)),
      safe(service.from('subscription_events').select('*').eq('user_id', userId)),
      safe(service.from('properties').select('id, street, house_number, postal_code, city, created_at').eq('owner_id', userId)),
    ]);

  const payload = {
    exportiert_am: new Date().toISOString(),
    hinweis:
      'Dies ist eine Auskunft über die zu deiner Person gespeicherten Daten gemäß Art. 15 DSGVO (Mieter + / ADB Dienstleistungen).',
    konto: profile,
    mietverhaeltnisse: tenancies,
    gemeldete_maengel: requestsAuthored,
    kommentare: comments,
    termin_buchungen: bookings,
    abo_historie: subscriptionEvents,
    eigene_immobilien: ownedProperties,
  };

  const filename = `mieterplus-datenauskunft-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
