-- =============================================================================
-- Bewertung der Mangel-Behebung + closed_at für Statistiken
-- =============================================================================

alter table public.requests
  add column if not exists resolution_rating   int check (resolution_rating between 1 and 5),
  add column if not exists resolution_feedback text,
  add column if not exists closed_at           timestamptz;

-- closed_at automatisch setzen, sobald ein Request 'closed' wird
create or replace function public.tg_set_request_closed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'closed' and (old.status is distinct from 'closed') then
    new.closed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists set_request_closed_at on public.requests;
create trigger set_request_closed_at
  before update on public.requests
  for each row execute function public.tg_set_request_closed_at();
