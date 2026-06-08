-- Support-Chat: 1 Thread pro User (User ↔ Admin).
-- Nachrichten gehören zum Thread des jeweiligen Users (thread_user_id).

create table if not exists public.support_messages (
  id             uuid primary key default gen_random_uuid(),
  thread_user_id uuid not null references public.profiles(id) on delete cascade,
  sender_id      uuid references public.profiles(id) on delete set null,
  from_admin     boolean not null default false,
  body           text not null check (char_length(body) between 1 and 4000),
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists support_messages_thread_idx
  on public.support_messages (thread_user_id, created_at);

alter table public.support_messages enable row level security;

-- Lesen: eigener Thread (User) oder alle (Admin)
create policy support_select on public.support_messages
  for select to authenticated
  using (thread_user_id = auth.uid() or public.mp_current_role() = 'admin');

-- Schreiben als User: nur in den eigenen Thread, nicht als Admin
create policy support_insert_user on public.support_messages
  for insert to authenticated
  with check (
    thread_user_id = auth.uid()
    and sender_id = auth.uid()
    and from_admin = false
  );

-- Schreiben als Admin: in jeden Thread, markiert als from_admin
create policy support_insert_admin on public.support_messages
  for insert to authenticated
  with check (
    public.mp_current_role() = 'admin'
    and sender_id = auth.uid()
    and from_admin = true
  );

-- KEIN allgemeines UPDATE-Recht (verhindert nachträgliches Editieren fremder
-- Nachrichten). Lesebestätigung läuft über eine SECURITY-DEFINER-Funktion,
-- die nur read_at fremder Nachrichten im eigenen/allen Threads setzt.
create or replace function public.mark_support_read(p_thread uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not (p_thread = auth.uid() or public.mp_current_role() = 'admin') then
    raise exception 'forbidden';
  end if;
  update public.support_messages
    set read_at = now()
    where thread_user_id = p_thread
      and read_at is null
      and sender_id is distinct from auth.uid();
end;
$$;

grant execute on function public.mark_support_read(uuid) to authenticated;

-- Realtime aktivieren
alter publication supabase_realtime add table public.support_messages;
