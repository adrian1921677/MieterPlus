import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/guards';

export const runtime = 'nodejs';

/**
 * DSGVO Art. 17 — Konto löschen (Anonymisierung).
 *
 * Entfernt alle personenbezogenen Daten des eingeloggten Users:
 *  - Ausweisdokumente aus dem Storage (reine PII)
 *  - Profil-PII (Name, Telefon, Anschrift, Verifizierung) → anonymisiert
 *  - Auth-Account: gesperrt (Ban) + E-Mail anonymisiert → kein Login mehr möglich
 *
 * Geteilte Datensätze (z. B. unterschriebene Übergabeprotokolle, Kommentare),
 * die die andere Vertragspartei rechtlich benötigt, bleiben referenziell
 * erhalten, zeigen aber „Gelöschtes Konto" statt des Namens.
 */
export async function POST() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const userId = guard.user.id;

  const service = createSupabaseServiceClient();

  // 1. Ausweisdokumente löschen (Pfad-Konvention: <userId>/<side>.<ext>)
  try {
    const { data: files } = await service.storage.from('identity-documents').list(userId);
    if (files && files.length > 0) {
      await service.storage
        .from('identity-documents')
        .remove(files.map((f) => `${userId}/${f.name}`));
    }
  } catch {
    // Best-effort — Storage-Fehler dürfen die Löschung nicht blockieren
  }

  // 2. Profil-PII anonymisieren
  const { error: profErr } = await service
    .from('profiles')
    .update({
      full_name: 'Gelöschtes Konto',
      phone: null,
      contact_street: null,
      contact_house_number: null,
      contact_postal_code: null,
      contact_city: null,
      identity_verified_at: null,
      identity_verified_by: null,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (profErr) {
    return NextResponse.json(
      { error: { message: 'Konto konnte nicht gelöscht werden. Bitte später erneut versuchen.' } },
      { status: 500 },
    );
  }

  // 3. Audit (vor dem Sperren, damit actor noch existiert)
  await service
    .rpc('log_audit', {
      p_action: 'account.deleted',
      p_entity_type: 'profile',
      p_entity_id: userId,
      p_payload: { method: 'self_service_anonymization' },
    })
    .then(() => {}, () => {});

  // 4. Auth-Account sperren + E-Mail anonymisieren (Login dauerhaft unterbinden)
  try {
    await service.auth.admin.updateUserById(userId, {
      email: `deleted+${userId}@deleted.invalid`,
      ban_duration: '876000h', // ~100 Jahre
      user_metadata: {},
    });
  } catch {
    // Best-effort
  }

  // 5. Lokale Session beenden
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
