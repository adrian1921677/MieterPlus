-- =============================================================================
-- Umstellung auf 3 Abo-Stufen: free / plus / pro
-- =============================================================================

-- Bestehende Werte migrieren (basic→free, premium→pro)
update public.profiles set subscription_plan = 'pro'  where subscription_plan = 'premium';
update public.profiles set subscription_plan = 'free' where subscription_plan = 'basic' or subscription_plan is null;

-- Default + Check anpassen
alter table public.profiles alter column subscription_plan set default 'free';
alter table public.profiles drop constraint if exists profiles_subscription_plan_check;
alter table public.profiles
  add constraint profiles_subscription_plan_check
  check (subscription_plan in ('free', 'plus', 'pro'));

-- is_premium = bezahlter Plan (plus oder pro) aktiv
create or replace function public.is_premium(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1 from public.profiles
    where id = p_user_id
      and subscription_plan in ('plus', 'pro')
      and (subscription_valid_until is null or subscription_valid_until > now())
  );
$$;
