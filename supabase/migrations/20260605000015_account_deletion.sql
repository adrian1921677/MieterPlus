-- DSGVO Art. 17: Konto-Löschung per Anonymisierung.
--
-- Wegen referenzieller Integrität (viele Tabellen verweisen mit ON DELETE
-- RESTRICT auf profiles — z. B. Kommentare, Übergabe-Signaturen, Anhänge, die
-- die jeweils andere Vertragspartei rechtlich benötigt) wird ein Konto NICHT
-- hart gelöscht, sondern anonymisiert: alle personenbezogenen Daten werden
-- entfernt, der Account-Zugang wird gesperrt (Ban via Auth-Admin-API).
-- deleted_at markiert anonymisierte Konten.

alter table public.profiles
  add column if not exists deleted_at timestamptz;

comment on column public.profiles.deleted_at is
  'Zeitpunkt der DSGVO-Anonymisierung (Konto-Löschung). NULL = aktives Konto.';
