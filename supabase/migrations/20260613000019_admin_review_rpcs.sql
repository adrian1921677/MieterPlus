-- =============================================================================
-- Admin-Review-RPCs: Property + Identity (für Mobile-App)
-- Replikate der Web-API-Routen — damit Mobile keinen Web-Detour braucht.
-- =============================================================================

create or replace function public.admin_review_property(
  p_property_id uuid,
  p_decision text,
  p_reason text default null
)
returns json
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_user uuid;
  v_role text;
  v_existing record;
  v_clean_reason text;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Nicht angemeldet' using errcode = '28000';
  end if;
  select role into v_role from public.profiles where id = v_user;
  if v_role <> 'admin' then
    raise exception 'Admin-Rolle erforderlich' using errcode = '42501';
  end if;
  if p_decision not in ('verified', 'rejected') then
    raise exception 'decision muss "verified" oder "rejected" sein' using errcode = '22023';
  end if;

  v_clean_reason := nullif(trim(coalesce(p_reason, '')), '');
  if p_decision = 'rejected' and (v_clean_reason is null or char_length(v_clean_reason) < 5) then
    raise exception 'Bei Ablehnung ist eine Begründung Pflicht' using errcode = '22023';
  end if;

  select id, ownership_status into v_existing
  from public.properties
  where id = p_property_id;

  if not found then
    raise exception 'Property nicht gefunden' using errcode = 'P0002';
  end if;
  if v_existing.ownership_status <> 'pending' then
    raise exception 'Property ist bereits %', v_existing.ownership_status
      using errcode = 'P0003';
  end if;

  update public.properties
  set ownership_status = p_decision,
      verified_at = case when p_decision = 'verified' then now() else null end,
      verified_by = v_user,
      rejection_reason = case when p_decision = 'rejected' then v_clean_reason else null end
  where id = p_property_id;

  perform public.log_audit(
    format('property.%s', p_decision),
    'property',
    p_property_id,
    jsonb_build_object('reason', v_clean_reason, 'actor', v_user, 'via', 'mobile_rpc')
  );

  return json_build_object('property_id', p_property_id, 'status', p_decision);
end;
$$;

grant execute on function public.admin_review_property(uuid, text, text) to authenticated;

-- =============================================================================
create or replace function public.admin_review_identity(
  p_user_id uuid,
  p_decision text,
  p_reason text default null
)
returns json
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_user uuid;
  v_role text;
  v_target record;
  v_clean_reason text;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Nicht angemeldet' using errcode = '28000';
  end if;
  select role into v_role from public.profiles where id = v_user;
  if v_role <> 'admin' then
    raise exception 'Admin-Rolle erforderlich' using errcode = '42501';
  end if;
  if p_decision not in ('verified', 'rejected') then
    raise exception 'decision muss "verified" oder "rejected" sein' using errcode = '22023';
  end if;

  v_clean_reason := nullif(trim(coalesce(p_reason, '')), '');
  if p_decision = 'rejected' and (v_clean_reason is null or char_length(v_clean_reason) < 5) then
    raise exception 'Bei Ablehnung ist eine Begründung Pflicht' using errcode = '22023';
  end if;

  select id, identity_verified_at into v_target
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'Profil nicht gefunden' using errcode = 'P0002';
  end if;

  update public.profiles
  set identity_verified_at = case when p_decision = 'verified' then now() else null end,
      identity_verified_by = v_user,
      identity_rejection_reason = case when p_decision = 'rejected' then v_clean_reason else null end
  where id = p_user_id;

  perform public.log_audit(
    format('identity.%s', p_decision),
    'profile',
    p_user_id,
    jsonb_build_object('reason', v_clean_reason, 'actor', v_user, 'via', 'mobile_rpc')
  );

  return json_build_object('user_id', p_user_id, 'status', p_decision);
end;
$$;

grant execute on function public.admin_review_identity(uuid, text, text) to authenticated;
