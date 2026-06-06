-- =============================================================================
-- Hausverwaltung: Eigentümer lädt Verwalter mit granularen Rechten ein
-- =============================================================================

create table if not exists public.property_managers (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  manager_id   uuid references public.profiles(id) on delete cascade,
  invite_email text not null,
  -- { requests:bool, vault:bool, appointments:bool, properties:bool }
  permissions  jsonb not null default '{}'::jsonb,
  status       text not null default 'pending' check (status in ('pending','active','revoked')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz
);
create index if not exists property_managers_owner_idx on public.property_managers(owner_id);
create index if not exists property_managers_manager_idx on public.property_managers(manager_id) where manager_id is not null;
create index if not exists property_managers_email_idx on public.property_managers(lower(invite_email));

create table if not exists public.property_manager_properties (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.property_managers(id) on delete cascade,
  property_id   uuid not null references public.properties(id) on delete cascade,
  unique (assignment_id, property_id)
);
create index if not exists pmp_assignment_idx on public.property_manager_properties(assignment_id);
create index if not exists pmp_property_idx on public.property_manager_properties(property_id);

-- =============================================================================
-- Helper: Verwaltet auth.uid() diese Property? (aktiv, irgendeine Berechtigung)
-- =============================================================================
create or replace function public.manages_property(p_property_id uuid)
returns boolean language sql stable security definer
set search_path = public set row_security = off as $$
  select exists(
    select 1
    from public.property_managers pm
    join public.property_manager_properties pmp on pmp.assignment_id = pm.id
    where pm.manager_id = auth.uid()
      and pm.status = 'active'
      and pmp.property_id = p_property_id
  );
$$;

-- Helper: Verwaltet auth.uid() diese Property MIT bestimmter Berechtigung?
create or replace function public.manages_property_perm(p_property_id uuid, p_perm text)
returns boolean language sql stable security definer
set search_path = public set row_security = off as $$
  select exists(
    select 1
    from public.property_managers pm
    join public.property_manager_properties pmp on pmp.assignment_id = pm.id
    where pm.manager_id = auth.uid()
      and pm.status = 'active'
      and pmp.property_id = p_property_id
      and coalesce((pm.permissions ->> p_perm)::boolean, false) = true
  );
$$;

-- Helper: über Tenancy → Unit → Property (für requests/handover)
create or replace function public.manages_tenancy_perm(p_tenancy_id uuid, p_perm text)
returns boolean language sql stable security definer
set search_path = public set row_security = off as $$
  select exists(
    select 1
    from public.tenancies t
    join public.units u on u.id = t.unit_id
    join public.property_managers pm on pm.manager_id = auth.uid() and pm.status = 'active'
    join public.property_manager_properties pmp
         on pmp.assignment_id = pm.id and pmp.property_id = u.property_id
    where t.id = p_tenancy_id
      and coalesce((pm.permissions ->> p_perm)::boolean, false) = true
  );
$$;

-- =============================================================================
-- RLS für property_managers / property_manager_properties
-- =============================================================================
alter table public.property_managers          enable row level security;
alter table public.property_manager_properties enable row level security;

-- Owner + zugewiesener Manager + Admin dürfen die Zuordnung sehen
drop policy if exists pm_select on public.property_managers;
create policy pm_select on public.property_managers
  for select to authenticated using (
    owner_id = auth.uid() or manager_id = auth.uid() or public.mp_current_role() = 'admin'
  );

-- Nur Owner verwaltet seine Einträge (Insert/Update/Delete).
-- Das Akzeptieren (manager_id setzen) läuft über Service-Role-API.
drop policy if exists pm_insert on public.property_managers;
create policy pm_insert on public.property_managers
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists pm_update on public.property_managers;
create policy pm_update on public.property_managers
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists pm_delete on public.property_managers;
create policy pm_delete on public.property_managers
  for delete to authenticated using (owner_id = auth.uid());

-- property_manager_properties: sichtbar wenn Zugriff auf Assignment
drop policy if exists pmp_select on public.property_manager_properties;
create policy pmp_select on public.property_manager_properties
  for select to authenticated using (
    exists(select 1 from public.property_managers pm
           where pm.id = property_manager_properties.assignment_id
             and (pm.owner_id = auth.uid() or pm.manager_id = auth.uid()
                  or public.mp_current_role() = 'admin'))
  );
drop policy if exists pmp_write on public.property_manager_properties;
create policy pmp_write on public.property_manager_properties
  for all to authenticated
  using (exists(select 1 from public.property_managers pm
               where pm.id = property_manager_properties.assignment_id and pm.owner_id = auth.uid()))
  with check (exists(select 1 from public.property_managers pm
               where pm.id = property_manager_properties.assignment_id and pm.owner_id = auth.uid()));

-- =============================================================================
-- Zusätzliche Manager-Policies auf bestehenden Tabellen (ADDITIV, OR-verknüpft)
-- =============================================================================
-- properties: Manager sieht zugewiesene
drop policy if exists properties_select_manager on public.properties;
create policy properties_select_manager on public.properties
  for select to authenticated using (public.manages_property(id));

-- units: Manager sieht + (mit 'properties'-Recht) verwaltet
drop policy if exists units_select_manager on public.units;
create policy units_select_manager on public.units
  for select to authenticated using (public.manages_property(property_id));
drop policy if exists units_write_manager on public.units;
create policy units_write_manager on public.units
  for all to authenticated
  using (public.manages_property_perm(property_id, 'properties'))
  with check (public.manages_property_perm(property_id, 'properties'));

-- tenancies: Manager sieht (über Property)
drop policy if exists tenancies_select_manager on public.tenancies;
create policy tenancies_select_manager on public.tenancies
  for select to authenticated using (
    exists(select 1 from public.units u where u.id = tenancies.unit_id
           and public.manages_property(u.property_id))
  );

-- requests: Manager mit 'requests'-Recht sieht + bearbeitet
drop policy if exists requests_select_manager on public.requests;
create policy requests_select_manager on public.requests
  for select to authenticated using (public.manages_tenancy_perm(tenancy_id, 'requests'));
drop policy if exists requests_update_manager on public.requests;
create policy requests_update_manager on public.requests
  for update to authenticated
  using (public.manages_tenancy_perm(tenancy_id, 'requests'))
  with check (public.manages_tenancy_perm(tenancy_id, 'requests'));

-- request_comments / attachments: Manager mit 'requests'-Recht
drop policy if exists request_comments_manager on public.request_comments;
create policy request_comments_manager on public.request_comments
  for all to authenticated
  using (exists(select 1 from public.requests r where r.id = request_comments.request_id
               and public.manages_tenancy_perm(r.tenancy_id, 'requests')))
  with check (exists(select 1 from public.requests r where r.id = request_comments.request_id
               and public.manages_tenancy_perm(r.tenancy_id, 'requests')));

-- vault_documents: Manager mit 'vault'-Recht
drop policy if exists vault_select_manager on public.vault_documents;
create policy vault_select_manager on public.vault_documents
  for select to authenticated using (public.manages_property(property_id));
drop policy if exists vault_write_manager on public.vault_documents;
create policy vault_write_manager on public.vault_documents
  for all to authenticated
  using (public.manages_property_perm(property_id, 'vault'))
  with check (public.manages_property_perm(property_id, 'vault'));

-- appointment_slots: Manager mit 'appointments'-Recht
drop policy if exists slot_select_manager on public.appointment_slots;
create policy slot_select_manager on public.appointment_slots
  for select to authenticated using (public.manages_property(property_id));
drop policy if exists slot_write_manager on public.appointment_slots;
create policy slot_write_manager on public.appointment_slots
  for all to authenticated
  using (public.manages_property_perm(property_id, 'appointments'))
  with check (public.manages_property_perm(property_id, 'appointments'));

-- handover_protocols: Manager mit 'properties'-Recht
drop policy if exists hp_select_manager on public.handover_protocols;
create policy hp_select_manager on public.handover_protocols
  for select to authenticated using (public.manages_tenancy_perm(tenancy_id, 'properties'));
drop policy if exists hp_write_manager on public.handover_protocols;
create policy hp_write_manager on public.handover_protocols
  for all to authenticated
  using (public.manages_tenancy_perm(tenancy_id, 'properties'))
  with check (public.manages_tenancy_perm(tenancy_id, 'properties'));
