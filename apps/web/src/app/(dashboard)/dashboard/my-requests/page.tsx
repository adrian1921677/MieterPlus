import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Wrench, Plus } from 'lucide-react';
import {
  REQUEST_CATEGORY_LABELS_DE,
  REQUEST_PRIORITY_LABELS_DE,
  REQUEST_STATUS_LABELS_DE,
  type RequestCategory,
  type RequestPriority,
  type RequestStatus,
} from '@mieterplus/shared';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Meine Mängel' };

function priorityVariant(priority: RequestPriority): 'destructive' | 'warning' | 'secondary' {
  if (priority === 'urgent') return 'destructive';
  if (priority === 'high') return 'warning';
  return 'secondary';
}

function statusVariant(
  status: RequestStatus,
): 'success' | 'warning' | 'info' | 'secondary' | 'destructive' {
  if (status === 'resolved') return 'success';
  if (status === 'in_progress') return 'info';
  if (status === 'open') return 'warning';
  if (status === 'rejected') return 'destructive';
  return 'secondary';
}

export default async function MyRequestsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: tenancies } = await supabase
    .from('tenancies')
    .select('id')
    .eq('tenant_id', user.id)
    .is('ended_at', null);

  const tenancyIds = (tenancies ?? []).map((t) => t.id);

  if (tenancyIds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keine Wohnung verknüpft</CardTitle>
          <CardDescription>
            Du musst zuerst eine Wohnung mit einem Einladungscode verknüpfen, bevor du Mängel
            melden kannst.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/join">Code eingeben</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { data: requests } = await supabase
    .from('requests')
    .select('id, title, category, priority, status, created_at')
    .in('tenancy_id', tenancyIds)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meine Mängel</h1>
          <p className="text-muted-foreground">
            Alle deine gemeldeten Mängel auf einen Blick.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/my-requests/new">
            <Plus className="h-4 w-4" />
            Neuen Mangel melden
          </Link>
        </Button>
      </div>

      {!requests || requests.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Noch keine Mängel gemeldet</CardTitle>
            <CardDescription>
              Wenn etwas in deiner Wohnung kaputt ist oder repariert werden muss, klicke auf
              „Neuen Mangel melden".
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {requests.map((r) => (
            <li key={r.id}>
              <Link href={`/dashboard/requests/${r.id}`}>
                <Card className="transition-shadow hover:shadow-card-hover">
                  <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{r.title}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">
                          {REQUEST_CATEGORY_LABELS_DE[r.category as RequestCategory]}
                        </Badge>
                        <Badge variant={priorityVariant(r.priority as RequestPriority)}>
                          {REQUEST_PRIORITY_LABELS_DE[r.priority as RequestPriority]}
                        </Badge>
                        <Badge variant={statusVariant(r.status as RequestStatus)}>
                          {REQUEST_STATUS_LABELS_DE[r.status as RequestStatus]}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('de-DE')}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
