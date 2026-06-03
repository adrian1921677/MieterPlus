-- =============================================================================
-- MieterPlus — Storage Buckets + RLS
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('ownership-documents', 'ownership-documents', false, 20971520,
    array['image/jpeg','image/png','image/heic','image/webp','application/pdf']),
  ('request-attachments', 'request-attachments', false, 10485760,
    array['image/jpeg','image/png','image/heic','image/webp','application/pdf'])
on conflict (id) do nothing;

-- =============================================================================
-- Pfad-Konvention:
--   ownership-documents: <property_id>/<uuid>.<ext>
--   request-attachments: <request_id>/<uuid>.<ext>
-- =============================================================================

-- ============== ownership-documents ==========================================
create policy "ownership_docs_select_owner"
on storage.objects for select to authenticated
using (
  bucket_id = 'ownership-documents'
  and public.is_property_owner((string_to_array(name, '/'))[1]::uuid)
);

create policy "ownership_docs_select_admin"
on storage.objects for select to authenticated
using (
  bucket_id = 'ownership-documents'
  and public.mp_current_role() = 'admin'
);

create policy "ownership_docs_insert_owner"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'ownership-documents'
  and public.is_property_owner((string_to_array(name, '/'))[1]::uuid)
  and auth.uid() = owner
);

create policy "ownership_docs_delete_owner"
on storage.objects for delete to authenticated
using (
  bucket_id = 'ownership-documents'
  and public.is_property_owner((string_to_array(name, '/'))[1]::uuid)
);

-- ============== request-attachments ==========================================
create or replace function public.user_can_access_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.requests r
    where r.id = p_request_id
      and (public.is_tenancy_tenant(r.tenancy_id) or public.is_tenancy_landlord(r.tenancy_id))
  );
$$;

create policy "request_attach_select_participants"
on storage.objects for select to authenticated
using (
  bucket_id = 'request-attachments'
  and public.user_can_access_request((string_to_array(name, '/'))[1]::uuid)
);

create policy "request_attach_insert_participants"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'request-attachments'
  and public.user_can_access_request((string_to_array(name, '/'))[1]::uuid)
  and auth.uid() = owner
);

create policy "request_attach_delete_uploader"
on storage.objects for delete to authenticated
using (
  bucket_id = 'request-attachments'
  and auth.uid() = owner
);
