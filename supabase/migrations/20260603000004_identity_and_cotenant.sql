-- =============================================================================
-- Identitätsprüfung für Vermieter + Co-Mieter-Codes
-- =============================================================================

-- Profile bekommen Identity-Verifikations-Felder
alter table public.profiles
  add column if not exists identity_verified_at    timestamptz,
  add column if not exists identity_verified_by    uuid references public.profiles(id) on delete set null,
  add column if not exists identity_rejection_reason text;

-- Tabelle für hochgeladene Perso-Bilder
create table if not exists public.identity_documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  file_path     text not null,
  document_side text not null check (document_side in ('front','back')),
  mime_type     text,
  uploaded_at   timestamptz not null default now()
);

create index if not exists identity_documents_user_idx on public.identity_documents(user_id);

alter table public.identity_documents enable row level security;

-- RLS: User sieht eigene, Admin sieht alle
create policy id_docs_select_self on public.identity_documents
  for select to authenticated using (user_id = auth.uid());
create policy id_docs_select_admin on public.identity_documents
  for select to authenticated using (public.mp_current_role() = 'admin');
create policy id_docs_insert_self on public.identity_documents
  for insert to authenticated with check (user_id = auth.uid());
create policy id_docs_delete_self on public.identity_documents
  for delete to authenticated using (
    user_id = auth.uid()
    and (select identity_verified_at from public.profiles where id = auth.uid()) is null
  );

-- Storage Bucket für Perso-Bilder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('identity-documents', 'identity-documents', false, 10485760,
    array['image/jpeg','image/png','image/heic','image/webp','application/pdf'])
on conflict (id) do nothing;

-- Storage-RLS: Pfad-Konvention <user_id>/<side>.<ext>
create policy "id_docs_storage_select_owner"
  on storage.objects for select to authenticated
  using (bucket_id = 'identity-documents'
    and (string_to_array(name, '/'))[1]::uuid = auth.uid());

create policy "id_docs_storage_select_admin"
  on storage.objects for select to authenticated
  using (bucket_id = 'identity-documents'
    and public.mp_current_role() = 'admin');

create policy "id_docs_storage_insert_owner"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'identity-documents'
    and (string_to_array(name, '/'))[1]::uuid = auth.uid()
    and auth.uid() = owner);

create policy "id_docs_storage_delete_owner"
  on storage.objects for delete to authenticated
  using (bucket_id = 'identity-documents'
    and (string_to_array(name, '/'))[1]::uuid = auth.uid());

-- =============================================================================
-- Co-Mieter-Codes: Mieter dürfen Codes für ihre eigene Wohnung erzeugen
-- =============================================================================
create policy invitations_insert_cotenant on public.tenant_invitations
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.tenancies t
      where t.unit_id = tenant_invitations.unit_id
        and t.tenant_id = auth.uid()
        and t.ended_at is null
    )
  );

create policy invitations_select_cotenant_creator on public.tenant_invitations
  for select to authenticated using (created_by = auth.uid());

-- =============================================================================
-- DSGVO: Identity-Dokumente nach 30 Tagen automatisch löschbar
-- =============================================================================
create or replace function public.purge_old_identity_documents()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with deleted as (
    delete from public.identity_documents
    where uploaded_at < now() - interval '30 days'
      and user_id in (select id from public.profiles where identity_verified_at is not null)
    returning file_path
  )
  select count(*) into v_count from deleted;
  return v_count;
end;
$$;
