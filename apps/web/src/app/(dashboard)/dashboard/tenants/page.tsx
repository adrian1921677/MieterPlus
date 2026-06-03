import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Mieter' };

export default async function TenantsPage() {
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

  const { data: tenancies } = await supabase
    .from('tenancies')
    .select(
      'id, started_at, ended_at, tenant_id, unit_id, profiles:tenant_id(full_name), units(unit_label, properties(street, house_number, postal_code, city, profiles:owner_id(full_name)))',
    )
    .order('started_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Alle Mieter</h1>
        <p className="text-muted-foreground">
          {tenancies?.length ?? 0} Mietverhältnis(se) systemweit
        </p>
      </div>

      {!tenancies || tenancies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Noch keine Mieter registriert</h2>
            <p className="text-sm text-muted-foreground">
              Sobald Mieter einen Einladungscode einlösen, erscheinen sie hier.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tenancies.map((t) => {
            /* eslint-disable @typescript-eslint/no-explicit-any */
            const tenant: any = (t as any).profiles;
            const unit: any = (t as any).units;
            const property: any = unit?.properties;
            const landlord: any = property?.profiles;
            /* eslint-enable @typescript-eslint/no-explicit-any */
            const active = !t.ended_at;
            return (
              <Card key={t.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        {tenant?.full_name ?? 'Unbekannter Mieter'}
                      </CardTitle>
                      <CardDescription>
                        {property
                          ? `${property.street} ${property.house_number}, ${property.postal_code} ${property.city}`
                          : '—'}
                        {unit?.unit_label && ` · ${unit.unit_label}`}
                        <span className="block text-xs">
                          Vermieter: {landlord?.full_name ?? '—'} · Eingezogen am{' '}
                          {formatDate(t.started_at)}
                          {t.ended_at && ` · Ausgezogen am ${formatDate(t.ended_at)}`}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge variant={active ? 'success' : 'secondary'}>
                      {active ? 'Aktiv' : 'Beendet'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`/dashboard/requests?tenant=${t.tenant_id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Mängel dieses Mieters anzeigen →
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
