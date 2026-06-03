import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';

const CODE_LENGTH = 12;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne I O 0 1
const EXPIRES_DAYS = 30;
const MAX_ACTIVE_PER_UNIT = 5;

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'landlord' && profile?.role !== 'admin') {
    return NextResponse.json(
      { error: { message: 'Vermieter- oder Admin-Rolle erforderlich' } },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const unitId = body?.unit_id;
  if (typeof unitId !== 'string' || !/^[0-9a-f-]{36}$/i.test(unitId)) {
    return NextResponse.json(
      { error: { message: 'unit_id (uuid) erforderlich' } },
      { status: 400 },
    );
  }

  const service = createSupabaseServiceClient();

  const { data: unit, error: unitErr } = await service
    .from('units')
    .select('id, property_id, properties:property_id (owner_id, ownership_status)')
    .eq('id', unitId)
    .maybeSingle();

  if (unitErr) return NextResponse.json({ error: { message: unitErr.message } }, { status: 500 });
  if (!unit) return NextResponse.json({ error: { message: 'Unit nicht gefunden' } }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prop: any = (unit as any).properties;
  if (!prop || (profile.role !== 'admin' && prop.owner_id !== user.id)) {
    return NextResponse.json(
      { error: { message: 'Keine Berechtigung für diese Unit' } },
      { status: 403 },
    );
  }
  if (prop.ownership_status !== 'verified') {
    return NextResponse.json(
      {
        error: {
          message: 'Property muss verifiziert sein, bevor Codes erstellt werden können',
        },
      },
      { status: 409 },
    );
  }

  const { count } = await service
    .from('tenant_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('unit_id', unitId)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString());

  if ((count ?? 0) >= MAX_ACTIVE_PER_UNIT) {
    return NextResponse.json(
      {
        error: {
          message: `Maximal ${MAX_ACTIVE_PER_UNIT} aktive Codes pro Unit. Bestehende ablaufen lassen oder einlösen.`,
        },
      },
      { status: 429 },
    );
  }

  let inserted = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + EXPIRES_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await service
      .from('tenant_invitations')
      .insert({
        unit_id: unitId,
        code,
        created_by: user.id,
        expires_at: expiresAt,
      })
      .select('id, code, expires_at, unit_id, created_at')
      .single();
    if (!error) {
      inserted = data;
      break;
    }
    if (error.code !== '23505') {
      return NextResponse.json({ error: { message: error.message } }, { status: 500 });
    }
  }
  if (!inserted) {
    return NextResponse.json(
      { error: { message: 'Code-Generierung fehlgeschlagen' } },
      { status: 500 },
    );
  }

  await service.rpc('log_audit', {
    p_action: 'tenant_invitation.created',
    p_entity_type: 'tenant_invitation',
    p_entity_id: inserted.id,
    p_payload: { unit_id: unitId, actor: user.id },
  });

  return NextResponse.json({ invitation: inserted }, { status: 201 });
}
