-- =============================================================================
-- Terminplaner (Premium-Feature)
-- =============================================================================

create table if not exists public.appointment_slots (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  created_by  uuid not null references public.profiles(id) on delete restrict,
  title       text not null check (char_length(title) between 1 and 160),
  purpose     text not null default 'other'
                check (purpose in ('maintenance','viewing','meeting','other')),
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  status      text not null default 'open' check (status in ('open','booked','cancelled')),
  created_at  timestamptz not null default now()
);
create index if not exists appointment_slots_property_idx on public.appointment_slots(property_id);
create index if not exists appointment_slots_status_idx on public.appointment_slots(status, starts_at);

create table if not exists public.appointment_bookings (
  id         uuid primary key default gen_random_uuid(),
  slot_id    uuid not null unique references public.appointment_slots(id) on delete cascade,
  tenant_id  uuid not null references public.profiles(id) on delete cascade,
  note       text,
  booked_at  timestamptz not null default now()
);
create index if not exists appointment_bookings_tenant_idx on public.appointment_bookings(tenant_id);

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.appointment_slots    enable row level security;
alter table public.appointment_bookings enable row level security;

-- Slots: Eigentümer + aktive Mieter der Property + Admin lesen
drop policy if exists slot_select on public.appointment_slots;
create policy slot_select on public.appointment_slots
  for select to authenticated using (
    public.is_property_owner(property_id)
    or public.is_tenant_of_property(property_id)
    or public.mp_current_role() = 'admin'
  );

-- Nur Eigentümer verwaltet Slots
drop policy if exists slot_insert on public.appointment_slots;
create policy slot_insert on public.appointment_slots
  for insert to authenticated
  with check (public.is_property_owner(property_id) and created_by = auth.uid());

drop policy if exists slot_update on public.appointment_slots;
create policy slot_update on public.appointment_slots
  for update to authenticated
  using (public.is_property_owner(property_id))
  with check (public.is_property_owner(property_id));

drop policy if exists slot_delete on public.appointment_slots;
create policy slot_delete on public.appointment_slots
  for delete to authenticated using (public.is_property_owner(property_id));

-- Bookings: Mieter (eigene) + Vermieter des Slots + Admin
drop policy if exists booking_select on public.appointment_bookings;
create policy booking_select on public.appointment_bookings
  for select to authenticated using (
    tenant_id = auth.uid()
    or public.mp_current_role() = 'admin'
    or exists(select 1 from public.appointment_slots s
              where s.id = appointment_bookings.slot_id
                and public.is_property_owner(s.property_id))
  );

-- Mieter bucht für sich, muss aktiver Mieter der Slot-Property sein
drop policy if exists booking_insert on public.appointment_bookings;
create policy booking_insert on public.appointment_bookings
  for insert to authenticated
  with check (
    tenant_id = auth.uid()
    and exists(select 1 from public.appointment_slots s
               where s.id = appointment_bookings.slot_id
                 and s.status = 'open'
                 and public.is_tenant_of_property(s.property_id))
  );

-- Mieter darf eigene Buchung stornieren
drop policy if exists booking_delete on public.appointment_bookings;
create policy booking_delete on public.appointment_bookings
  for delete to authenticated using (
    tenant_id = auth.uid()
    or exists(select 1 from public.appointment_slots s
              where s.id = appointment_bookings.slot_id
                and public.is_property_owner(s.property_id))
  );
