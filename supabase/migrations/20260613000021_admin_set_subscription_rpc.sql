-- RPC: Admin setzt Tarif eines Users (manuell, ohne Stripe-Detour).
create or replace function public.admin_set_subscription(
  p_user_id uuid,
  p_plan text,
  p_months int default 12
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
  v_valid timestamptz;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Nicht angemeldet' using errcode = '28000';
  end if;
  select role into v_role from public.profiles where id = v_user;
  if v_role <> 'admin' then
    raise exception 'Admin-Rolle erforderlich' using errcode = '42501';
  end if;
  if p_plan not in ('trial', 'plus', 'pro', 'payg') then
    raise exception 'plan muss trial|plus|pro|payg sein' using errcode = '22023';
  end if;
  if coalesce(p_months, 12) < 1 or coalesce(p_months, 12) > 60 then
    raise exception 'months muss zwischen 1 und 60 liegen' using errcode = '22023';
  end if;

  select subscription_plan into v_target from public.profiles where id = p_user_id;
  if not found then
    raise exception 'User nicht gefunden' using errcode = 'P0002';
  end if;

  v_valid := now() + (coalesce(p_months, 12) * interval '30 days');

  update public.profiles
  set subscription_plan = p_plan,
      subscription_valid_until = v_valid
  where id = p_user_id;

  insert into public.subscription_events (user_id, old_plan, new_plan, source, valid_until, actor_id)
  values (p_user_id, v_target.subscription_plan, p_plan, 'admin_rpc', v_valid, v_user);

  perform public.log_audit('subscription.granted', 'profile', p_user_id,
    jsonb_build_object('plan', p_plan, 'valid_until', v_valid, 'by', v_user));

  return json_build_object('user_id', p_user_id, 'plan', p_plan, 'valid_until', v_valid);
end;
$$;

grant execute on function public.admin_set_subscription(uuid, text, int) to authenticated;
