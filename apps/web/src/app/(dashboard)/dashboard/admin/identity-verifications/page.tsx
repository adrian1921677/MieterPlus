import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserCheck } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Identitäts-Prüfungen' };

export default async function IdentityVerificationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') redirect('/dashboard');

  // Vermieter, die Perso-Dokumente hochgeladen haben aber noch nicht verifiziert sind
  const { data: pending } = await supabase
    .from('identity_documents')
    .select('user_id, uploaded_at, profiles:user_id(full_name, role, identity_verified_at, identity_rejection_reason)')
    .order('uploaded_at', { ascending: false });

  // unique nach user_id, nur unverifizierte
  const uniquePending = Array.from(
    new Map(
      (pending ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((d: any) => d.profiles && !d.profiles.identity_verified_at)
        .map((d) => [d.user_id, d]),
    ).values(),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Identitäts-Prüfungen</h1>
        <p className="text-muted-foreground">
          {uniquePending.length} ausstehende Identitäts-Verifikation(en)
        </p>
      </div>

      {uniquePending.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <UserCheck className="mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Keine offenen Identitäts-Prüfungen</h2>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {uniquePending.map((d) => {
            /* eslint-disable @typescript-eslint/no-explicit-any */
            const p: any = (d as any).profiles;
            /* eslint-enable @typescript-eslint/no-explicit-any */
            const wasRejected = !!p?.identity_rejection_reason;
            return (
              <Link key={d.user_id} href={`/dashboard/admin/identity-verifications/${d.user_id}`}>
                <Card className="transition hover:border-primary/40 hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{p?.full_name ?? 'Unbekannt'}</CardTitle>
                        <CardDescription>
                          Rolle: {p?.role === 'landlord' ? 'Vermieter' : p?.role} ·{' '}
                          Hochgeladen am {formatDate(d.uploaded_at)}
                        </CardDescription>
                      </div>
                      <Badge variant={wasRejected ? 'destructive' : 'warning'}>
                        {wasRejected ? 'Erneut eingereicht' : 'Pending'}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
