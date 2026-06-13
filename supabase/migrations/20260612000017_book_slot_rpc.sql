-- =============================================================================
-- RPC: Termin-Slot buchen (für Mobile-App — gleiche Logik wie Web-API)
-- Atomar: Slot open→booked + Booking-Insert. SECURITY DEFINER umgeht RLS,
-- prüft aber selbst alle Berechtigungen.
-- =============================================================================
create or replace function public.book_appointment_slot(
  p_slot_id uuid,
  p_note text default null
)
returns json
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_user_id uuid;
  v_slot record;
  v_updated record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Nicht angemeldet' using errcode = '28000';
  end if;

  select * into v_slot
  from public.appointment_slots
  where id = p_slot_id;

  if not found then
    raise exception 'Termin nicht gefunden' using errcode = 'P0002';
  end if;

  if v_slot.status <> 'open' then
    raise exception 'Dieser Termin ist bereits vergeben.' using errcode = 'P0003';
  end if;

  -- Mieter muss aktiver Mieter der Property sein
  if not exists (
    select 1
    from public.tenancies t
    join public.units u on u.id = t.unit_id
    where t.tenant_id = v_user_id
      and t.ended_at is null
      and u.property_id = v_slot.property_id
  ) then
    raise exception 'Nur Mieter dieser Immobilie können buchen.' using errcode = '42501';
  end if;

  -- Slot reservieren — nur wenn noch open (Race-Schutz)
  update public.appointment_slots
  set status = 'booked'
  where id = p_slot_id and status = 'open'
  returning * into v_updated;

  if not found then
    raise exception 'Termin wurde gerade von jemand anderem gebucht.' using errcode = 'P0004';
  end if;

  insert into public.appointment_bookings (slot_id, tenant_id, note)
  values (p_slot_id, v_user_id, nullif(trim(coalesce(p_note, '')), ''));

  perform public.log_audit('appointment.booked', 'appointment_slot', p_slot_id,
    jsonb_build_object('tenant', v_user_id, 'via', 'mobile_rpc'));

  return json_build_object(
    'slot_id', p_slot_id,
    'starts_at', v_slot.starts_at,
    'ends_at', v_slot.ends_at,
    'title', v_slot.title
  );
end;
$$;

grant execute on function public.book_appointment_slot(uuid, text) to authenticated;

-- =============================================================================
-- RPC: Buchung stornieren (Mieter storniert eigene Buchung → Slot wieder open)
-- =============================================================================
create or replace function public.cancel_appointment_booking(p_slot_id uuid)
returns json
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_user_id uuid;
  v_deleted int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Nicht angemeldet' using errcode = '28000';
  end if;

  delete from public.appointment_bookings
  where slot_id = p_slot_id and tenant_id = v_user_id;
  get diagnostics v_deleted = row_count;

  if v_deleted = 0 then
    raise exception 'Keine eigene Buchung für diesen Termin gefunden.' using errcode = 'P0002';
  end if;

  update public.appointment_slots
  set status = 'open'
  where id = p_slot_id and status = 'booked';

  perform public.log_audit('appointment.cancelled', 'appointment_slot', p_slot_id,
    jsonb_build_object('tenant', v_user_id, 'via', 'mobile_rpc'));

  return json_build_object('slot_id', p_slot_id, 'status', 'open');
end;
$$;

grant execute on function public.cancel_appointment_booking(uuid) to authenticated;
