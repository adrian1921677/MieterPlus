import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';

export const metadata = { title: 'Verifikationen' };

export default async function VerificationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') redirect('/dashboard');

  const { data: properties } = await supabase
    .from('properties')
    .select(
      'id, street, house_number, postal_code, city, created_at, owner_id, profiles:owner_id(full_name)',
    )
    .eq('ownership_status', 'pending')
    .order('created_at');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Eigentumsprüfungen</h1>
        <p className="text-muted-foreground">
          {properties?.length ?? 0} ausstehende Immobilie(n)
        </p>
      </div>

      {!properties || properties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldCheck className="mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Alle Verifikationen abgeschlossen</h2>
            <p className="text-sm text-muted-foreground">
              Aktuell warten keine Immobilien auf Prüfung.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {properties.map((p) => (
            <Link key={p.id} href={`/dashboard/admin/verifications/${p.id}`}>
              <Card className="transition hover:border-primary/40 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        {p.street} {p.house_number}
                      </CardTitle>
                      <CardDescription>
                        {p.postal_code} {p.city} ·{' '}
                        {/* deno-lint-ignore no-explicit-any */}
                        Inhaber: {(p as any).profiles?.full_name ?? 'Unbekannt'} ·{' '}
                        Eingereicht am {formatDate(p.created_at)}
                      </CardDescription>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
