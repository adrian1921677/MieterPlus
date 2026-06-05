import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Users, Home, Wrench, ShieldCheck } from 'lucide-react';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VerifiedBadge } from '@/components/ui/verified-badge';

export const metadata = { title: 'User-Verwaltung' };

type Filter = 'all' | 'tenant' | 'landlord' | 'admin';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (me?.role !== 'admin') redirect('/dashboard');

  const sp = await searchParams;
  const filter: Filter =
    sp.filter === 'tenant' || sp.filter === 'landlord' || sp.filter === 'admin'
      ? sp.filter
      : 'all';

  // Service-Client für vollständige User-Liste (Admin darf alles sehen)
  const service = createSupabaseServiceClient();

  // Profile + zusammenhängende Counts (Tenancies für Mieter, Properties für Vermieter)
  const { data: profiles } = await service
    .from('profiles')
    .select('id, full_name, role, identity_verified_at, created_at')
    .order('created_at', { ascending: false });

  // Auth-User (E-Mails) — nur via Service-Client möglich
  const { data: authData } = await service.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map(authData.users.map((u) => [u.id, u.email ?? '—']));

  // Zusatz-Stats pro User
  const userIds = (profiles ?? []).map((p) => p.id);
  const [{ data: properties }, { data: tenancies }] = await Promise.all([
    service.from('properties').select('owner_id').in('owner_id', userIds),
    service.from('tenancies').select('tenant_id, ended_at').in('tenant_id', userIds),
  ]);
  const propCountByOwner = new Map<string, number>();
  for (const p of properties ?? []) {
    propCountByOwner.set(p.owner_id, (propCountByOwner.get(p.owner_id) ?? 0) + 1);
  }
  const activeTenanciesByTenant = new Map<string, number>();
  for (const t of tenancies ?? []) {
    if (t.ended_at) continue;
    activeTenanciesByTenant.set(
      t.tenant_id,
      (activeTenanciesByTenant.get(t.tenant_id) ?? 0) + 1,
    );
  }

  const all = profiles ?? [];
  const counts = {
    all: all.length,
    tenant: all.filter((p) => p.role === 'tenant').length,
    landlord: all.filter((p) => p.role === 'landlord').length,
    admin: all.filter((p) => p.role === 'admin').length,
  };

  const filtered = filter === 'all' ? all : all.filter((p) => p.role === filter);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="h-6 w-6" />
          User-Verwaltung
        </h1>
        <p className="text-muted-foreground">
          Alle registrierten Mieter, Vermieter und Admins — chronologisch sortiert.
        </p>
      </div>

      {/* ── Filter-Tabs ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-100 pb-3">
        <FilterTab label="Alle" count={counts.all} value="all" active={filter} />
        <FilterTab label="Mieter" count={counts.tenant} value="tenant" active={filter} />
        <FilterTab label="Vermieter" count={counts.landlord} value="landlord" active={filter} />
        <FilterTab label="Admins" count={counts.admin} value="admin" active={filter} />
      </div>

      {/* ── Liste ────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Keine User gefunden</CardTitle>
            <CardDescription>Mit diesem Filter gibt es keine Einträge.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-100">
              {filtered.map((p) => {
                const email = emailById.get(p.id) ?? '—';
                const propCount = propCountByOwner.get(p.id) ?? 0;
                const tenCount = activeTenanciesByTenant.get(p.id) ?? 0;
                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="flex items-center gap-3">
                      <RoleAvatar role={p.role} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{p.full_name}</span>
                          {p.identity_verified_at && (
                            <VerifiedBadge size={14} label="Identität verifiziert" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{email}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <RoleBadge role={p.role} />
                      {p.role === 'landlord' && (
                        <Badge variant="outline" className="gap-1">
                          <Home className="h-3 w-3" />
                          {propCount} {propCount === 1 ? 'Immobilie' : 'Immobilien'}
                        </Badge>
                      )}
                      {p.role === 'tenant' && tenCount > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <Wrench className="h-3 w-3" />
                          {tenCount} {tenCount === 1 ? 'Wohnung' : 'Wohnungen'}
                        </Badge>
                      )}
                      <span className="text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FilterTab({
  label,
  count,
  value,
  active,
}: {
  label: string;
  count: number;
  value: Filter;
  active: Filter;
}) {
  const isActive = active === value;
  return (
    <Link
      href={value === 'all' ? '/dashboard/admin/users' : `/dashboard/admin/users?filter=${value}`}
      className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? 'border-brand bg-brand text-white'
          : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
      }`}
    >
      {label} <span className={`ml-1 text-xs ${isActive ? 'opacity-80' : 'opacity-60'}`}>{count}</span>
    </Link>
  );
}

function RoleAvatar({ role }: { role: string }) {
  const colors =
    role === 'admin'
      ? 'bg-red-100 text-red-700'
      : role === 'landlord'
        ? 'bg-[#eff6ff] text-[#2563a8]'
        : 'bg-zinc-100 text-zinc-700';
  const initial = role === 'admin' ? 'A' : role === 'landlord' ? 'V' : 'M';
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${colors}`}
      aria-hidden
    >
      {initial}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'admin')
    return (
      <Badge variant="destructive" className="gap-1">
        <ShieldCheck className="h-3 w-3" />
        Administrator
      </Badge>
    );
  if (role === 'landlord') return <Badge variant="info">Vermieter</Badge>;
  return <Badge variant="secondary">Mieter</Badge>;
}
