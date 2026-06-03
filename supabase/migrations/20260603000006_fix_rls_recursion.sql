-- =============================================================================
-- Fix: Infinite Recursion bei units/properties/tenancies Policies
-- =============================================================================
-- Problem: SECURITY DEFINER allein reicht nicht — wir müssen explizit
-- row_security = off setzen, damit die Helper-Funktionen wirklich RLS umgehen.
-- =============================================================================

create or replace function public.mp_current_role()
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_property_owner(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1 from public.properties
    where id = p_property_id and owner_id = auth.uid()
  );
$$;

create or replace function public.is_unit_owner(p_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1 from public.units u
    join public.properties p on p.id = u.property_id
    where u.id = p_unit_id and p.owner_id = auth.uid()
  );
$$;

create or replace function public.is_tenancy_tenant(p_tenancy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1 from public.tenancies
    where id = p_tenancy_id and tenant_id = auth.uid()
  );
$$;

create or replace function public.is_tenancy_landlord(p_tenancy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1 from public.tenancies t
    join public.units u on u.id = t.unit_id
    join public.properties p on p.id = u.property_id
    where t.id = p_tenancy_id and p.owner_id = auth.uid()
  );
$$;

create or replace function public.user_can_access_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.requests r
    where r.id = p_request_id
      and (public.is_tenancy_tenant(r.tenancy_id) or public.is_tenancy_landlord(r.tenancy_id))
  );
$$;

create or replace function public.is_tenant_of_property(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1
    from public.tenancies t
    join public.units u on u.id = t.unit_id
    where u.property_id = p_property_id
      and t.tenant_id = auth.uid()
      and t.ended_at is null
  );
$$;

create or replace function public.is_tenant_of_unit(p_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1 from public.tenancies
    where unit_id = p_unit_id
      and tenant_id = auth.uid()
      and ended_at is null
  );
$$;

create or replace function public.property_ownership_status(p_property_id uuid)
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select ownership_status from public.properties where id = p_property_id;
$$;

create or replace function public.request_status(p_request_id uuid)
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select status from public.requests where id = p_request_id;
$$;

drop policy if exists properties_select_tenant on public.properties;
create policy properties_select_tenant on public.properties
  for select to authenticated
  using (public.is_tenant_of_property(id));

drop policy if exists units_select_tenant on public.units;
create policy units_select_tenant on public.units
  for select to authenticated
  using (public.is_tenant_of_unit(id));

drop policy if exists properties_update_owner on public.properties;
create policy properties_update_owner on public.properties
  for update to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and ownership_status = public.property_ownership_status(properties.id)
  );

drop policy if exists units_insert_owner on public.units;
create policy units_insert_owner on public.units
  for insert to authenticated
  with check (
    public.is_property_owner(property_id)
    and public.property_ownership_status(property_id) = 'verified'
  );

drop policy if exists requests_update_tenant on public.requests;
create policy requests_update_tenant on public.requests
  for update to authenticated
  using (public.is_tenancy_tenant(tenancy_id) and status = 'open')
  with check (
    public.is_tenancy_tenant(tenancy_id)
    and status = public.request_status(requests.id)
  );

drop policy if exists odocs_delete_owner on public.ownership_documents;
create policy odocs_delete_owner on public.ownership_documents
  for delete to authenticated using (
    public.is_property_owner(property_id)
    and public.property_ownership_status(property_id) = 'pending'
  );
