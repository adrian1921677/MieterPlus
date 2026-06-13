-- =============================================================================
-- Neue Tarif-Struktur: Trial (14 Tage) / Plus / Pro / Pay-as-you-go
-- =============================================================================
-- Free wird abgeschafft. Jeder neue Vermieter startet automatisch im 14-Tage-
-- Trial mit vollem Plus-Funktionsumfang. Danach: Plus 29,99 €, Pro 49,99 €,
-- oder Pay-as-you-go (zusammengeklickte Bausteine; finale Summe aus
-- payg_modules-JSONB).
-- =============================================================================

-- Check-Constraint anpassen
alter table public.profiles drop constraint if exists profiles_subscription_plan_check;

-- Bestehende 'free'-Accounts: in 14-Tage-Trial verwandeln (rückwirkend)
update public.profiles
set subscription_plan      = 'trial',
    subscription_valid_until = greatest(
      coalesce(subscription_valid_until, now()),
      now() + interval '14 days'
    )
where subscription_plan = 'free';

-- Default für neue Accounts: 'trial'
alter table public.profiles alter column subscription_plan set default 'trial';

-- Neue Check-Constraint
alter table public.profiles
  add constraint profiles_subscription_plan_check
  check (subscription_plan in ('trial', 'plus', 'pro', 'payg'));

-- Pay-as-you-go-Konfiguration: welche Bausteine + berechneter Monatspreis (Cents)
alter table public.profiles
  add column if not exists payg_modules    jsonb,
  add column if not exists payg_price_cents int;

-- Trial-Tracker: wann startete der Trial?
alter table public.profiles
  add column if not exists trial_started_at timestamptz;

-- Neuanmeldungen (Vermieter): Trial sofort starten via Trigger
create or replace function public.tg_start_trial_for_landlord()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if new.role = 'landlord' and (new.subscription_plan is null or new.subscription_plan = 'trial') then
    new.subscription_plan := 'trial';
    new.trial_started_at  := coalesce(new.trial_started_at, now());
    if new.subscription_valid_until is null then
      new.subscription_valid_until := now() + interval '14 days';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profile_start_trial on public.profiles;
create trigger profile_start_trial
  before insert on public.profiles
  for each row execute function public.tg_start_trial_for_landlord();

-- is_premium: trial / plus / pro / payg gelten alle als premium-aktiv
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
      and subscription_plan in ('trial', 'plus', 'pro', 'payg')
      and (subscription_valid_until is null or subscription_valid_until > now())
  );
$$;

-- Trial-Status: ist der User aktuell im aktiven Trial?
create or replace function public.is_in_trial(p_user_id uuid)
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
      and subscription_plan = 'trial'
      and (subscription_valid_until is null or subscription_valid_until > now())
  );
$$;

-- Übergangs-View für Migration: was war der gewählte Plan?
comment on column public.profiles.payg_modules is
  'Pay-as-you-go: {extra_properties:int, units_bundles:int, vault_bundles:int, handover:bool, appointments_premium:bool, managers:int}';
comment on column public.profiles.payg_price_cents is
  'Pay-as-you-go: berechneter monatlicher Preis in Cents — gespiegelt aus Stripe-Subscription';

-- Sicherheit: payg_price_cents darf nur der Webhook-User (service role) setzen.
-- RLS auf profiles bleibt bestehend; payg_modules darf der Owner sehen/anpassen.
