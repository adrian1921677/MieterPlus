import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getUserFromAuthHeader(
  req: Request,
): Promise<{ userId: string; role: 'tenant' | 'landlord' | 'admin' } | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY missing');

  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await client.auth.getUser();
  if (userErr || !userData.user) return null;

  const service = getServiceClient();
  const { data: profile, error: pErr } = await service
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();
  if (pErr || !profile) return null;

  return { userId: userData.user.id, role: profile.role as 'tenant' | 'landlord' | 'admin' };
}

export async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const salt = Deno.env.get('IP_HASH_SALT') ?? 'mieterplus-dev-salt';
  const data = new TextEncoder().encode(salt + '|' + ip);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
