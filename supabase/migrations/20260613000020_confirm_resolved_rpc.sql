-- =============================================================================
-- RPC: Mieter bestätigt oder lehnt "behoben"-Status ab.
-- =============================================================================
create or replace function public.tenant_confirm_resolved(
  p_request_id uuid,
  p_action text, -- 'confirm' | 'reject'
  p_rating int default null,
  p_feedback text default null
)
returns json
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_user uuid;
  v_req record;
  v_clean_feedback text;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Nicht angemeldet' using errcode = '28000';
  end if;
  if p_action not in ('confirm', 'reject') then
    raise exception 'action muss confirm oder reject sein' using errcode = '22023';
  end if;
  if p_rating is not null and (p_rating < 1 or p_rating > 5) then
    raise exception 'rating muss zwischen 1 und 5 liegen' using errcode = '22023';
  end if;

  v_clean_feedback := nullif(trim(coalesce(p_feedback, '')), '');

  select r.id, r.status, r.tenancy_id, t.tenant_id
  into v_req
  from public.requests r
  join public.tenancies t on t.id = r.tenancy_id
  where r.id = p_request_id;

  if not found then
    raise exception 'Anfrage nicht gefunden' using errcode = 'P0002';
  end if;
  if v_req.tenant_id <> v_user then
    raise exception 'Nur der Mieter dieser Anfrage kann das bestätigen' using errcode = '42501';
  end if;
  if v_req.status <> 'resolved' then
    raise exception 'Anfrage ist nicht im Status resolved' using errcode = 'P0003';
  end if;

  if p_action = 'confirm' then
    update public.requests set status = 'closed' where id = p_request_id;
    perform public.log_audit(
      'request.confirmed_resolved', 'request', p_request_id,
      jsonb_build_object('tenant', v_user, 'rating', p_rating, 'feedback', v_clean_feedback)
    );
  else
    update public.requests set status = 'in_progress' where id = p_request_id;
    perform public.log_audit(
      'request.reopened', 'request', p_request_id,
      jsonb_build_object('tenant', v_user, 'feedback', v_clean_feedback)
    );
  end if;

  -- Bewertung optional speichern (sofern Tabelle vorhanden — wir versuchen es)
  if p_rating is not null and p_action = 'confirm' then
    begin
      insert into public.request_ratings (request_id, tenant_id, rating, feedback)
      values (p_request_id, v_user, p_rating, v_clean_feedback)
      on conflict (request_id) do update
        set rating = excluded.rating, feedback = excluded.feedback;
    exception when undefined_table then
      -- request_ratings noch nicht migriert → Bewertung nur im Audit-Log
      null;
    end;
  end if;

  return json_build_object('request_id', p_request_id, 'action', p_action);
end;
$$;

grant execute on function public.tenant_confirm_resolved(uuid, text, int, text) to authenticated;
