-- Profil: zusätzliche (optionale) Angaben, die der User selbst pflegen kann.
-- Kontakt-/Postanschrift. Alle Felder optional; PLZ wenn gesetzt 5-stellig.

alter table public.profiles
  add column if not exists contact_street text
    check (contact_street is null or char_length(contact_street) <= 120),
  add column if not exists contact_house_number text
    check (contact_house_number is null or char_length(contact_house_number) <= 20),
  add column if not exists contact_postal_code text
    check (contact_postal_code is null or contact_postal_code ~ '^\d{5}$'),
  add column if not exists contact_city text
    check (contact_city is null or char_length(contact_city) <= 80);

comment on column public.profiles.contact_street is 'Optionale Kontakt-/Postanschrift: Straße';
comment on column public.profiles.contact_house_number is 'Optionale Kontakt-/Postanschrift: Hausnummer';
comment on column public.profiles.contact_postal_code is 'Optionale Kontakt-/Postanschrift: PLZ (5-stellig)';
comment on column public.profiles.contact_city is 'Optionale Kontakt-/Postanschrift: Ort';
