-- =============================================================================
-- Dokumenten-Tresor + Audit-Log (Lesebestätigung)
-- =============================================================================

create table if not exists public.vault_documents (
  id                uuid primary key default gen_random_uuid(),
  property_id       uuid not null references public.properties(id) on delete cascade,
  uploaded_by       uuid not null references public.profiles(id) on delete restrict,
  type              text not null check (type in
                      ('lease','utility_statement','house_rules','other')),
  title             text not null check (char_length(title) between 1 and 200),
  file_path         text not null,
  mime_type         text,
  visible_to_tenant boolean not null default true,
  created_at        timestamptz not null default now()
);
create index if not exists vault_documents_property_idx on public.vault_documents(property_id);
create index if not exists vault_documents_uploader_idx on public.vault_documents(uploaded_by);

-- Audit-Log: wann hat wer ein Dokument geöffnet/heruntergeladen?
create table if not exists public.document_access_log (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.vault_documents(id) on delete cascade,
  viewer_id    uuid not null references public.profiles(id) on delete cascade,
  action       text not null check (action in ('viewed','downloaded')),
  created_at   timestamptz not null default now()
);
create index if not exists document_access_log_doc_idx on public.document_access_log(document_id, created_at desc);

-- =============================================================================
-- RLS-Helper
-- =============================================================================
-- Darf der User dieses Dokument sehen? (Eigentümer ODER aktiver Mieter bei Freigabe)
create or replace function public.can_access_vault_document(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1 from public.vault_documents d
    where d.id = p_document_id
      and (
        public.is_property_owner(d.property_id)
        or (d.visible_to_tenant and public.is_tenant_of_property(d.property_id))
      )
  );
$$;

-- =============================================================================
-- RLS aktivieren + Policies
-- =============================================================================
alter table public.vault_documents     enable row level security;
alter table public.document_access_log  enable row level security;

-- vault_documents: SELECT Eigentümer + freigegebene Mieter + Admin
drop policy if exists vault_select on public.vault_documents;
create policy vault_select on public.vault_documents
  for select to authenticated using (
    public.is_property_owner(property_id)
    or (visible_to_tenant and public.is_tenant_of_property(property_id))
    or public.mp_current_role() = 'admin'
  );

-- INSERT/UPDATE/DELETE nur Eigentümer
drop policy if exists vault_insert on public.vault_documents;
create policy vault_insert on public.vault_documents
  for insert to authenticated
  with check (public.is_property_owner(property_id) and uploaded_by = auth.uid());

drop policy if exists vault_update on public.vault_documents;
create policy vault_update on public.vault_documents
  for update to authenticated
  using (public.is_property_owner(property_id))
  with check (public.is_property_owner(property_id));

drop policy if exists vault_delete on public.vault_documents;
create policy vault_delete on public.vault_documents
  for delete to authenticated using (public.is_property_owner(property_id));

-- document_access_log
-- SELECT: Eigentümer des Dokuments (sieht Lesebestätigungen) + der Viewer selbst + Admin
drop policy if exists dal_select on public.document_access_log;
create policy dal_select on public.document_access_log
  for select to authenticated using (
    viewer_id = auth.uid()
    or public.mp_current_role() = 'admin'
    or exists(select 1 from public.vault_documents d
              where d.id = document_access_log.document_id
                and public.is_property_owner(d.property_id))
  );

-- INSERT: nur der Viewer selbst, und nur wenn er Zugriff auf das Dokument hat
drop policy if exists dal_insert on public.document_access_log;
create policy dal_insert on public.document_access_log
  for insert to authenticated
  with check (viewer_id = auth.uid() and public.can_access_vault_document(document_id));

-- =============================================================================
-- Storage-Bucket
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('document-vault', 'document-vault', false, 20971520,
    array['application/pdf','image/jpeg','image/png','image/heic','image/webp'])
on conflict (id) do nothing;

-- Pfad-Konvention: <property_id>/<uuid>.<ext>
drop policy if exists "vault_storage_select" on storage.objects;
create policy "vault_storage_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'document-vault'
    and (public.is_property_owner((string_to_array(name,'/'))[1]::uuid)
         or public.is_tenant_of_property((string_to_array(name,'/'))[1]::uuid)));

drop policy if exists "vault_storage_insert" on storage.objects;
create policy "vault_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'document-vault'
    and public.is_property_owner((string_to_array(name,'/'))[1]::uuid)
    and auth.uid() = owner);

drop policy if exists "vault_storage_delete" on storage.objects;
create policy "vault_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'document-vault' and auth.uid() = owner);
