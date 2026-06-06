import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { getPropertyAccess } from '@/lib/access';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { Building2, Plus } from 'lucide-react';

export const metadata = { title: 'Immobilien' };

export default async function PropertiesPage() {
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
  const isAdmin = me?.role === 'admin';

  const service = createSupabaseServiceClient();
  const access = isAdmin
    ? null
    : await getPropertyAccess(service, user.id);
  const managedSet = new Set(access ? Object.keys(access.managedPerms) : []);

  let query = (isAdmin ? supabase : service)
    .from('properties')
    .select(
      'id, street, house_number, postal_code, city, ownership_status, created_at, rejection_reason, owner_id, profiles:owner_id(full_name, identity_verified_at)',
    )
    .order('created_at', { ascending: false });
  if (!isAdmin) query = query.in('id', access!.allIds.length ? access!.allIds : ['00000000-0000-0000-0000-000000000000']);

  const { data: properties } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isAdmin ? 'Alle Immobilien' : 'Meine Immobilien'}
          </h1>
          <p className="text-muted-foreground">
            {properties?.length ?? 0} Immobilie(n){isAdmin ? ' systemweit' : ' registriert'}
          </p>
        </div>
        {!isAdmin && (
          <Button asChild>
            <Link href="/dashboard/properties/new">
              <Plus className="h-4 w-4" />
              Immobilie hinzufügen
            </Link>
          </Button>
        )}
      </div>

      {!properties || properties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="mb-1 text-lg font-semibold">
              {isAdmin ? 'Keine Immobilien im System' : 'Noch keine Immobilie'}
            </h2>
            <p className="mb-6 max-w-md text-sm text-muted-foreground">
              {isAdmin
                ? 'Sobald Vermieter Immobilien anlegen, erscheinen sie hier.'
                : 'Lege deine erste Immobilie an und lade deinen Eigentumsnachweis hoch. Nach Freigabe durch unser Team kannst du Mieter einladen.'}
            </p>
            {!isAdmin && (
              <Button asChild>
                <Link href="/dashboard/properties/new">
                  <Plus className="h-4 w-4" />
                  Erste Immobilie hinzufügen
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {properties.map((p) => (
            <Link key={p.id} href={`/dashboard/properties/${p.id}`}>
              <Card className="transition hover:border-primary/40 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="flex flex-wrap items-center gap-1.5 text-base">
                        <span>
                          {p.street} {p.house_number}
                        </span>
                        {p.ownership_status === 'verified' && <VerifiedBadge />}
                        {managedSet.has(p.id) && (
                          <Badge variant="outline" className="text-[10px]">
                            Verwaltung
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {p.postal_code} {p.city}
                        {isAdmin && (
                          <span className="mt-1 flex items-center gap-1 text-xs">
                            <span>Vermieter:</span>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            <span>{(p as any).profiles?.full_name ?? '—'}</span>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {(p as any).profiles?.identity_verified_at && (
                              <VerifiedBadge size={12} label="Identität verifiziert" />
                            )}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    {p.ownership_status !== 'verified' && (
                      <StatusBadge status={p.ownership_status} />
                    )}
                  </div>
                </CardHeader>
                {p.ownership_status === 'rejected' && p.rejection_reason && (
                  <CardContent>
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      <strong>Abgelehnt:</strong> {p.rejection_reason}
                    </div>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'verified') return <Badge variant="success">Verifiziert</Badge>;
  if (status === 'rejected') return <Badge variant="destructive">Abgelehnt</Badge>;
  return <Badge variant="warning">In Prüfung</Badge>;
}
