-- =============================================================================
-- MieterPlus — Initial Schema
-- Erstellt: 2026-06-03
-- =============================================================================
-- Konventionen:
--   * Alle Tabellen haben RLS aktiviert (siehe Folge-Migration für Policies)
--   * UUIDs als Primary Keys
--   * Timestamps in UTC mit timestamptz
--   * Soft-Cascade-Verhalten dort, wo Lösch-Compliance es erfordert
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- -----------------------------------------------------------------------------
-- ENUMs als CHECK-Constraints (für Erweiterbarkeit, anstatt enum types)
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- profiles — erweitert auth.users mit App-Daten
-- -----------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('tenant','landlord','admin')),
  full_name     text not null check (char_length(full_name) between 2 and 120),
  phone         text check (phone is null or char_length(phone) <= 40),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);

-- -----------------------------------------------------------------------------
-- properties — Immobilien
-- -----------------------------------------------------------------------------
create table public.properties (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.profiles(id) on delete restrict,
  street            text not null check (char_length(street) between 2 and 120),
  house_number      text not null check (char_length(house_number) between 1 and 20),
  postal_code       text not null check (postal_code ~ '^\d{5}$'),
  city              text not null check (char_length(city) between 2 and 80),
  country           text not null default 'DE' check (char_length(country) = 2),
  ownership_status  text not null default 'pending'
                      check (ownership_status in ('pending','verified','rejected')),
  verified_at       timestamptz,
  verified_by       uuid references public.profiles(id) on delete set null,
  rejection_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index properties_owner_idx  on public.properties(owner_id);
create index properties_status_idx on public.properties(ownership_status);

-- -----------------------------------------------------------------------------
-- ownership_documents — Belege zur Eigentumsprüfung
-- -----------------------------------------------------------------------------
create table public.ownership_documents (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references public.properties(id) on delete cascade,
  file_path       text not null,
  document_type   text not null check (document_type in
                    ('land_register','notary_deed','purchase_contract','other')),
  uploaded_by     uuid not null references public.profiles(id) on delete restrict,
  created_at      timestamptz not null default now()
);

create index ownership_docs_property_idx on public.ownership_documents(property_id);

-- -----------------------------------------------------------------------------
-- units — Wohneinheiten innerhalb einer property
-- -----------------------------------------------------------------------------
create table public.units (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties(id) on delete cascade,
  unit_label    text not null check (char_length(unit_label) between 1 and 120),
  created_at    timestamptz not null default now(),
  unique (property_id, unit_label)
);

create index units_property_idx on public.units(property_id);

-- -----------------------------------------------------------------------------
-- tenant_invitations — vom Vermieter generierte Codes
-- -----------------------------------------------------------------------------
create table public.tenant_invitations (
  id              uuid primary key default gen_random_uuid(),
  unit_id         uuid not null references public.units(id) on delete cascade,
  code            text not null unique check (code ~ '^[A-Z0-9]{12}$'),
  created_by      uuid not null references public.profiles(id) on delete restrict,
  expires_at      timestamptz not null,
  used_at         timestamptz,
  used_by         uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index tenant_invitations_unit_idx on public.tenant_invitations(unit_id);
create index tenant_invitations_code_idx on public.tenant_invitations(code) where used_at is null;

-- -----------------------------------------------------------------------------
-- tenancies — bestätigtes Mietverhältnis
-- -----------------------------------------------------------------------------
create table public.tenancies (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.profiles(id) on delete cascade,
  unit_id     uuid not null references public.units(id) on delete cascade,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);

create index tenancies_tenant_idx on public.tenancies(tenant_id) where ended_at is null;
create index tenancies_unit_idx   on public.tenancies(unit_id)   where ended_at is null;

-- Nur eine aktive Tenancy pro (tenant, unit)
create unique index tenancies_unique_active_idx
  on public.tenancies(tenant_id, unit_id)
  where ended_at is null;

-- -----------------------------------------------------------------------------
-- requests — Mängel/Aufträge
-- -----------------------------------------------------------------------------
create table public.requests (
  id            uuid primary key default gen_random_uuid(),
  tenancy_id    uuid not null references public.tenancies(id) on delete restrict,
  title         text not null check (char_length(title) between 3 and 140),
  description   text not null check (char_length(description) between 10 and 4000),
  category      text not null check (category in
                  ('heating','plumbing','electrical','structural','appliance','pest','other')),
  priority      text not null default 'normal'
                  check (priority in ('low','normal','high','urgent')),
  status        text not null default 'open'
                  check (status in ('open','in_progress','resolved','closed','rejected')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index requests_tenancy_idx  on public.requests(tenancy_id);
create index requests_status_idx   on public.requests(status);
create index requests_priority_idx on public.requests(priority);
create index requests_created_idx  on public.requests(created_at desc);

-- -----------------------------------------------------------------------------
-- request_attachments — Fotos/Dokumente zu Anfragen
-- -----------------------------------------------------------------------------
create table public.request_attachments (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.requests(id) on delete cascade,
  file_path     text not null,
  mime_type     text,
  uploaded_by   uuid not null references public.profiles(id) on delete restrict,
  created_at    timestamptz not null default now()
);

create index request_attachments_request_idx on public.request_attachments(request_id);

-- -----------------------------------------------------------------------------
-- request_comments — Kommunikation Mieter ↔ Vermieter pro Anfrage
-- -----------------------------------------------------------------------------
create table public.request_comments (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.requests(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete restrict,
  message       text not null check (char_length(message) between 1 and 4000),
  created_at    timestamptz not null default now()
);

create index request_comments_request_idx on public.request_comments(request_id, created_at);

-- -----------------------------------------------------------------------------
-- push_tokens — Expo Push Tokens
-- -----------------------------------------------------------------------------
create table public.push_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  token         text not null unique,
  platform      text not null check (platform in ('ios','android','web')),
  created_at    timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens(user_id);

-- -----------------------------------------------------------------------------
-- audit_log — Sicherheits-/Compliance-Log
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references public.profiles(id) on delete set null,
  action        text not null,
  entity_type   text not null,
  entity_id     uuid,
  payload       jsonb,
  created_at    timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log(entity_type, entity_id);
create index audit_log_actor_idx  on public.audit_log(actor_id);
create index audit_log_created_idx on public.audit_log(created_at desc);

-- -----------------------------------------------------------------------------
-- invitation_attempts — Rate-Limit für Code-Einlöseversuche
-- -----------------------------------------------------------------------------
create table public.invitation_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  ip_hash       text,
  code_tried    text,
  success       boolean not null default false,
  created_at    timestamptz not null default now()
);

create index invitation_attempts_user_idx on public.invitation_attempts(user_id, created_at desc);
create index invitation_attempts_ip_idx   on public.invitation_attempts(ip_hash, created_at desc);

-- =============================================================================
-- Trigger: updated_at automatisch pflegen
-- =============================================================================
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.tg_set_updated_at();

create trigger requests_set_updated_at
  before update on public.requests
  for each row execute function public.tg_set_updated_at();

-- =============================================================================
-- Trigger: Profil bei Auth-Signup automatisch anlegen
-- raw_user_meta_data muss { role, full_name } enthalten
-- =============================================================================
create or replace function public.tg_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_name text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'tenant');
  v_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  if v_role not in ('tenant','landlord','admin') then
    v_role := 'tenant';
  end if;

  insert into public.profiles (id, role, full_name)
  values (new.id, v_role, v_name);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_handle_new_user();

-- =============================================================================
-- Audit-Logging Helfer
-- =============================================================================
create or replace function public.log_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_payload jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, action, entity_type, entity_id, payload)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_payload);
end;
$$;
