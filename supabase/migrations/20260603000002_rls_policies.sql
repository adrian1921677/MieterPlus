-- =============================================================================
-- MieterPlus — Row Level Security Policies
-- =============================================================================
-- Sicherheitsmodell:
--   tenant   → sieht/erstellt eigene Profile/Tenancies/Requests/Kommentare
--   landlord → sieht eigene Properties/Units/Invitations/Requests aller eigenen
--              Units; ändert Status & schreibt Kommentare auf eigenen Requests
--   admin    → liest alle Daten + verifiziert Properties (Inserts/Updates via
--              Edge Function mit Service Role oder spezielle Policy)
-- =============================================================================

-- Hilfsfunktion: aktuelle Rolle
create or replace function public.mp_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Hilfsfunktion: Owner einer Property?
create or replace function public.is_property_owner(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.properties
    where id = p_property_id and owner_id = auth.uid()
  );
$$;

-- Hilfsfunktion: Owner einer Unit?
create or replace function public.is_unit_owner(p_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.units u
    join public.properties p on p.id = u.property_id
    where u.id = p_unit_id and p.owner_id = auth.uid()
  );
$$;

-- Hilfsfunktion: aktiver Mieter einer Tenancy?
create or replace function public.is_tenancy_tenant(p_tenancy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.tenancies
    where id = p_tenancy_id and tenant_id = auth.uid()
  );
$$;

-- Hilfsfunktion: Owner der Unit, zu der die Tenancy gehört?
create or replace function public.is_tenancy_landlord(p_tenancy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.tenancies t
    join public.units u on u.id = t.unit_id
    join public.properties p on p.id = u.property_id
    where t.id = p_tenancy_id and p.owner_id = auth.uid()
  );
$$;

-- =============================================================================
-- RLS aktivieren auf allen Tabellen
-- =============================================================================
alter table public.profiles             enable row level security;
alter table public.properties           enable row level security;
alter table public.ownership_documents  enable row level security;
alter table public.units                enable row level security;
alter table public.tenant_invitations   enable row level security;
alter table public.tenancies            enable row level security;
alter table public.requests             enable row level security;
alter table public.request_attachments  enable row level security;
alter table public.request_comments     enable row level security;
alter table public.push_tokens          enable row level security;
alter table public.audit_log            enable row level security;
alter table public.invitation_attempts  enable row level security;

-- =============================================================================
-- profiles
-- =============================================================================
create policy profiles_select_self on public.profiles
  for select to authenticated using (id = auth.uid());

create policy profiles_select_admin on public.profiles
  for select to authenticated using (public.mp_current_role() = 'admin');

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- Inserts laufen über tg_handle_new_user (security definer). Keine direkten Inserts erlaubt.

-- Profile von Beteiligten sichtbar (Vermieter ↔ Mieter):
-- Vermieter darf Profile seiner Mieter sehen
create policy profiles_select_tenants_of_landlord on public.profiles
  for select to authenticated using (
    exists (
      select 1
      from public.tenancies t
      join public.units u on u.id = t.unit_id
      join public.properties p on p.id = u.property_id
      where t.tenant_id = profiles.id and p.owner_id = auth.uid()
    )
  );

-- Mieter darf Profile des Vermieters seiner Unit sehen
create policy profiles_select_landlord_of_tenant on public.profiles
  for select to authenticated using (
    exists (
      select 1
      from public.properties p
      join public.units u on u.property_id = p.id
      join public.tenancies t on t.unit_id = u.id
      where p.owner_id = profiles.id and t.tenant_id = auth.uid()
    )
  );

-- =============================================================================
-- properties
-- =============================================================================
create policy properties_select_owner on public.properties
  for select to authenticated using (owner_id = auth.uid());

create policy properties_select_admin on public.properties
  for select to authenticated using (public.mp_current_role() = 'admin');

-- Mieter sieht die Property, in der er wohnt
create policy properties_select_tenant on public.properties
  for select to authenticated using (
    exists (
      select 1
      from public.units u
      join public.tenancies t on t.unit_id = u.id
      where u.property_id = properties.id and t.tenant_id = auth.uid()
    )
  );

create policy properties_insert_landlord on public.properties
  for insert to authenticated
  with check (owner_id = auth.uid() and public.mp_current_role() = 'landlord');

create policy properties_update_owner on public.properties
  for update to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    -- Owner darf Verifikations-Status nicht ändern
    and ownership_status = (select ownership_status from public.properties p2 where p2.id = properties.id)
  );

create policy properties_update_admin on public.properties
  for update to authenticated
  using (public.mp_current_role() = 'admin')
  with check (public.mp_current_role() = 'admin');

-- =============================================================================
-- ownership_documents
-- =============================================================================
create policy odocs_select_owner on public.ownership_documents
  for select to authenticated using (public.is_property_owner(property_id));

create policy odocs_select_admin on public.ownership_documents
  for select to authenticated using (public.mp_current_role() = 'admin');

create policy odocs_insert_owner on public.ownership_documents
  for insert to authenticated
  with check (public.is_property_owner(property_id) and uploaded_by = auth.uid());

create policy odocs_delete_owner on public.ownership_documents
  for delete to authenticated using (
    public.is_property_owner(property_id)
    and (
      select ownership_status from public.properties where id = ownership_documents.property_id
    ) = 'pending'
  );

-- =============================================================================
-- units
-- =============================================================================
create policy units_select_owner on public.units
  for select to authenticated using (public.is_property_owner(property_id));

create policy units_select_tenant on public.units
  for select to authenticated using (
    exists (
      select 1 from public.tenancies t
      where t.unit_id = units.id and t.tenant_id = auth.uid()
    )
  );

create policy units_select_admin on public.units
  for select to authenticated using (public.mp_current_role() = 'admin');

create policy units_insert_owner on public.units
  for insert to authenticated
  with check (
    public.is_property_owner(property_id)
    and (select ownership_status from public.properties where id = property_id) = 'verified'
  );

create policy units_update_owner on public.units
  for update to authenticated
  using (public.is_property_owner(property_id))
  with check (public.is_property_owner(property_id));

create policy units_delete_owner on public.units
  for delete to authenticated using (
    public.is_property_owner(property_id)
    and not exists (
      select 1 from public.tenancies t
      where t.unit_id = units.id and t.ended_at is null
    )
  );

-- =============================================================================
-- tenant_invitations
-- (Code-Einlösung läuft ausschließlich über Edge Function mit Service Role)
-- =============================================================================
create policy invitations_select_owner on public.tenant_invitations
  for select to authenticated using (public.is_unit_owner(unit_id));

create policy invitations_select_admin on public.tenant_invitations
  for select to authenticated using (public.mp_current_role() = 'admin');

-- Inserts NUR über Edge Function (kein Client-Insert)
-- Keine SELECT-Policy für Mieter — sie sehen ihren eigenen Code nie

-- =============================================================================
-- tenancies
-- =============================================================================
create policy tenancies_select_self on public.tenancies
  for select to authenticated using (tenant_id = auth.uid());

create policy tenancies_select_landlord on public.tenancies
  for select to authenticated using (public.is_unit_owner(unit_id));

create policy tenancies_select_admin on public.tenancies
  for select to authenticated using (public.mp_current_role() = 'admin');

-- Inserts laufen über Edge Function (Code-Verifizierung)
-- Owner darf eine Tenancy beenden
create policy tenancies_update_landlord on public.tenancies
  for update to authenticated
  using (public.is_unit_owner(unit_id))
  with check (public.is_unit_owner(unit_id));

-- =============================================================================
-- requests
-- =============================================================================
create policy requests_select_tenant on public.requests
  for select to authenticated using (public.is_tenancy_tenant(tenancy_id));

create policy requests_select_landlord on public.requests
  for select to authenticated using (public.is_tenancy_landlord(tenancy_id));

create policy requests_select_admin on public.requests
  for select to authenticated using (public.mp_current_role() = 'admin');

create policy requests_insert_tenant on public.requests
  for insert to authenticated
  with check (public.is_tenancy_tenant(tenancy_id));

-- Mieter darf Titel/Beschreibung/Kategorie/Priority ihrer eigenen offenen Requests editieren
create policy requests_update_tenant on public.requests
  for update to authenticated
  using (public.is_tenancy_tenant(tenancy_id) and status in ('open'))
  with check (
    public.is_tenancy_tenant(tenancy_id)
    and status = (select status from public.requests r2 where r2.id = requests.id)
  );

-- Vermieter darf Status ändern (alle Felder via with check beschränken)
create policy requests_update_landlord on public.requests
  for update to authenticated
  using (public.is_tenancy_landlord(tenancy_id))
  with check (public.is_tenancy_landlord(tenancy_id));

-- =============================================================================
-- request_attachments
-- =============================================================================
create policy ra_select_tenant on public.request_attachments
  for select to authenticated using (
    exists (select 1 from public.requests r where r.id = request_id and public.is_tenancy_tenant(r.tenancy_id))
  );

create policy ra_select_landlord on public.request_attachments
  for select to authenticated using (
    exists (select 1 from public.requests r where r.id = request_id and public.is_tenancy_landlord(r.tenancy_id))
  );

create policy ra_insert_participant on public.request_attachments
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.requests r
      where r.id = request_id
        and (public.is_tenancy_tenant(r.tenancy_id) or public.is_tenancy_landlord(r.tenancy_id))
    )
  );

create policy ra_delete_uploader on public.request_attachments
  for delete to authenticated using (uploaded_by = auth.uid());

-- =============================================================================
-- request_comments
-- =============================================================================
create policy rc_select_tenant on public.request_comments
  for select to authenticated using (
    exists (select 1 from public.requests r where r.id = request_id and public.is_tenancy_tenant(r.tenancy_id))
  );

create policy rc_select_landlord on public.request_comments
  for select to authenticated using (
    exists (select 1 from public.requests r where r.id = request_id and public.is_tenancy_landlord(r.tenancy_id))
  );

create policy rc_insert_participant on public.request_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.requests r
      where r.id = request_id
        and (public.is_tenancy_tenant(r.tenancy_id) or public.is_tenancy_landlord(r.tenancy_id))
    )
  );

-- =============================================================================
-- push_tokens — nur eigene
-- =============================================================================
create policy pt_select_self on public.push_tokens
  for select to authenticated using (user_id = auth.uid());

create policy pt_insert_self on public.push_tokens
  for insert to authenticated with check (user_id = auth.uid());

create policy pt_delete_self on public.push_tokens
  for delete to authenticated using (user_id = auth.uid());

-- =============================================================================
-- audit_log — nur Admin lesbar; Inserts nur via security-definer-Funktion
-- =============================================================================
create policy audit_select_admin on public.audit_log
  for select to authenticated using (public.mp_current_role() = 'admin');

-- =============================================================================
-- invitation_attempts — nur Service-Role / Admin
-- =============================================================================
create policy ia_select_admin on public.invitation_attempts
  for select to authenticated using (public.mp_current_role() = 'admin');
