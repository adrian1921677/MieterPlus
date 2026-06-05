-- =============================================================================
-- Digitales Übergabeprotokoll (Premium-Feature)
-- =============================================================================

-- Haupt-Tabelle
create table if not exists public.handover_protocols (
  id               uuid primary key default gen_random_uuid(),
  tenancy_id       uuid not null references public.tenancies(id) on delete cascade,
  type             text not null check (type in ('move_in','move_out')),
  created_by       uuid not null references public.profiles(id) on delete restrict,
  status           text not null default 'draft'
                     check (status in ('draft','awaiting_signatures','completed')),
  -- Zählerstände: { electricity:{value,meter_no}, water:{...}, gas:{...} }
  meter_readings   jsonb not null default '{}'::jsonb,
  -- Schlüssel: [{ label, count }]
  keys             jsonb not null default '[]'::jsonb,
  general_notes    text,
  pdf_path         text,
  tenant_signed_at    timestamptz,
  landlord_signed_at  timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists handover_protocols_tenancy_idx on public.handover_protocols(tenancy_id);
create index if not exists handover_protocols_status_idx on public.handover_protocols(status);

-- Räume (Zustand/Mängel pro Raum)
create table if not exists public.handover_rooms (
  id           uuid primary key default gen_random_uuid(),
  protocol_id  uuid not null references public.handover_protocols(id) on delete cascade,
  room_label   text not null check (char_length(room_label) between 1 and 120),
  notes        text,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists handover_rooms_protocol_idx on public.handover_rooms(protocol_id);

-- Fotos pro Raum
create table if not exists public.handover_photos (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.handover_rooms(id) on delete cascade,
  file_path  text not null,
  caption    text,
  created_at timestamptz not null default now()
);
create index if not exists handover_photos_room_idx on public.handover_photos(room_id);

-- Unterschriften
create table if not exists public.handover_signatures (
  id           uuid primary key default gen_random_uuid(),
  protocol_id  uuid not null references public.handover_protocols(id) on delete cascade,
  signer_id    uuid not null references public.profiles(id) on delete restrict,
  signer_role  text not null check (signer_role in ('tenant','landlord')),
  image_path   text not null,
  signed_at    timestamptz not null default now(),
  unique (protocol_id, signer_role)
);
create index if not exists handover_signatures_protocol_idx on public.handover_signatures(protocol_id);

-- updated_at-Trigger (nutzt vorhandene tg_set_updated_at)
drop trigger if exists set_updated_at_handover on public.handover_protocols;
create trigger set_updated_at_handover
  before update on public.handover_protocols
  for each row execute function public.tg_set_updated_at();

-- =============================================================================
-- RLS-Helper: Ist User Teilnehmer (Mieter ODER Vermieter) des Protokolls?
-- =============================================================================
create or replace function public.is_protocol_participant(p_protocol_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1
    from public.handover_protocols hp
    where hp.id = p_protocol_id
      and (public.is_tenancy_tenant(hp.tenancy_id)
           or public.is_tenancy_landlord(hp.tenancy_id))
  );
$$;

-- Ist User Vermieter des Protokolls? (für Schreibrechte)
create or replace function public.is_protocol_landlord(p_protocol_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1
    from public.handover_protocols hp
    where hp.id = p_protocol_id
      and public.is_tenancy_landlord(hp.tenancy_id)
  );
$$;

-- =============================================================================
-- RLS aktivieren + Policies
-- =============================================================================
alter table public.handover_protocols  enable row level security;
alter table public.handover_rooms       enable row level security;
alter table public.handover_photos      enable row level security;
alter table public.handover_signatures  enable row level security;

-- handover_protocols
drop policy if exists hp_select on public.handover_protocols;
create policy hp_select on public.handover_protocols
  for select to authenticated
  using (public.is_tenancy_tenant(tenancy_id) or public.is_tenancy_landlord(tenancy_id)
         or public.mp_current_role() = 'admin');

drop policy if exists hp_insert on public.handover_protocols;
create policy hp_insert on public.handover_protocols
  for insert to authenticated
  with check (public.is_tenancy_landlord(tenancy_id) and created_by = auth.uid());

drop policy if exists hp_update on public.handover_protocols;
create policy hp_update on public.handover_protocols
  for update to authenticated
  using (public.is_tenancy_landlord(tenancy_id))
  with check (public.is_tenancy_landlord(tenancy_id));

-- handover_rooms (Vermieter verwaltet, beide lesen)
drop policy if exists hr_select on public.handover_rooms;
create policy hr_select on public.handover_rooms
  for select to authenticated using (public.is_protocol_participant(protocol_id));
drop policy if exists hr_write on public.handover_rooms;
create policy hr_write on public.handover_rooms
  for all to authenticated
  using (public.is_protocol_landlord(protocol_id))
  with check (public.is_protocol_landlord(protocol_id));

-- handover_photos (über Raum → Protokoll)
drop policy if exists hph_select on public.handover_photos;
create policy hph_select on public.handover_photos
  for select to authenticated using (
    exists(select 1 from public.handover_rooms r
           where r.id = handover_photos.room_id
             and public.is_protocol_participant(r.protocol_id))
  );
drop policy if exists hph_write on public.handover_photos;
create policy hph_write on public.handover_photos
  for all to authenticated
  using (
    exists(select 1 from public.handover_rooms r
           where r.id = handover_photos.room_id
             and public.is_protocol_landlord(r.protocol_id))
  )
  with check (
    exists(select 1 from public.handover_rooms r
           where r.id = handover_photos.room_id
             and public.is_protocol_landlord(r.protocol_id))
  );

-- handover_signatures (beide Teilnehmer lesen; jeder unterschreibt für sich)
drop policy if exists hs_select on public.handover_signatures;
create policy hs_select on public.handover_signatures
  for select to authenticated using (public.is_protocol_participant(protocol_id));
drop policy if exists hs_insert on public.handover_signatures;
create policy hs_insert on public.handover_signatures
  for insert to authenticated
  with check (signer_id = auth.uid() and public.is_protocol_participant(protocol_id));

-- =============================================================================
-- Storage-Buckets
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('handover-photos', 'handover-photos', false, 10485760,
    array['image/jpeg','image/png','image/heic','image/webp']),
  ('handover-pdfs', 'handover-pdfs', false, 20971520,
    array['application/pdf'])
on conflict (id) do nothing;

-- Pfad-Konvention: <protocol_id>/<...>. RLS via is_protocol_participant.
drop policy if exists "handover_photos_select" on storage.objects;
create policy "handover_photos_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'handover-photos'
    and public.is_protocol_participant((string_to_array(name,'/'))[1]::uuid));

drop policy if exists "handover_photos_insert" on storage.objects;
create policy "handover_photos_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'handover-photos'
    and public.is_protocol_participant((string_to_array(name,'/'))[1]::uuid)
    and auth.uid() = owner);

drop policy if exists "handover_photos_delete" on storage.objects;
create policy "handover_photos_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'handover-photos' and auth.uid() = owner);

-- PDFs: Teilnehmer lesen (Upload erfolgt über Service-Role in der API)
drop policy if exists "handover_pdfs_select" on storage.objects;
create policy "handover_pdfs_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'handover-pdfs'
    and public.is_protocol_participant((string_to_array(name,'/'))[1]::uuid));
