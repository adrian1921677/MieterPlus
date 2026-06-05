-- =============================================================================
-- Premium-Abo-Modell für Vermieter
-- =============================================================================

-- Profile bekommen Abo-Felder
alter table public.profiles
  add column if not exists subscription_plan       text not null default 'basic'
    check (subscription_plan in ('basic','premium')),
  add column if not exists subscription_valid_until timestamptz,
  add column if not exists subscription_auto_renew  boolean not null default false,
  add column if not exists stripe_customer_id       text,
  add column if not exists stripe_subscription_id   text;

-- Helper: Ist der User aktuell Premium?
-- security definer + row_security off → keine RLS-Rekursion (Pattern aus 0006)
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
      and subscription_plan = 'premium'
      and (subscription_valid_until is null or subscription_valid_until > now())
  );
$$;

-- Convenience-Variante für den eingeloggten User
create or replace function public.current_user_is_premium()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.is_premium(auth.uid());
$$;

-- =============================================================================
-- subscription_events — Audit-Trail für Plan-Wechsel
-- =============================================================================
create table if not exists public.subscription_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  old_plan    text,
  new_plan    text not null,
  source      text not null check (source in ('admin','stripe','system')),
  valid_until timestamptz,
  actor_id    uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists subscription_events_user_idx
  on public.subscription_events(user_id, created_at desc);

alter table public.subscription_events enable row level security;

-- User sieht eigene Events
drop policy if exists subscription_events_select_self on public.subscription_events;
create policy subscription_events_select_self on public.subscription_events
  for select to authenticated using (user_id = auth.uid());

-- Admin sieht alle
drop policy if exists subscription_events_select_admin on public.subscription_events;
create policy subscription_events_select_admin on public.subscription_events
  for select to authenticated using (public.mp_current_role() = 'admin');

-- Inserts laufen ausschließlich über Service-Role (API-Routen) — keine
-- direkten Client-Inserts erlaubt (keine insert-Policy = blockiert für authenticated).
