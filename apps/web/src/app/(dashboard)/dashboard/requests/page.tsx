import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  REQUEST_STATUS_LABELS_DE,
  REQUEST_PRIORITY_LABELS_DE,
  REQUEST_CATEGORY_LABELS_DE,
  type RequestStatus,
  type RequestPriority,
  type RequestCategory,
} from '@mieterplus/shared';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { relativeTime } from '@/lib/utils';
import { Wrench } from 'lucide-react';

export const metadata = { title: 'Mängel' };

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string }>;
}) {
  const sp = await searchParams;
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

  let query = supabase
    .from('requests')
    .select(
      'id, title, category, priority, status, created_at, updated_at, tenancy_id, tenancies!inner(unit_id, units!inner(unit_label, property_id, properties!inner(street, house_number, owner_id, profiles:owner_id(full_name))))',
    )
    .order('created_at', { ascending: false });

  if (!isAdmin) {
    query = query.eq('tenancies.units.properties.owner_id', user.id);
  }
  if (sp.status) query = query.eq('status', sp.status);
  if (sp.priority) query = query.eq('priority', sp.priority);

  const { data: requests } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {isAdmin ? 'Alle Mängel & Aufträge' : 'Mängel & Aufträge'}
        </h1>
        <p className="text-muted-foreground">
          {requests?.length ?? 0} Anfrage(n){isAdmin ? ' systemweit' : ''}{' '}
          {sp.status ? `· Status: ${REQUEST_STATUS_LABELS_DE[sp.status as RequestStatus]}` : ''}
          {sp.priority
            ? ` · Priorität: ${REQUEST_PRIORITY_LABELS_DE[sp.priority as RequestPriority]}`
            : ''}
        </p>
      </div>

      <FilterBar currentStatus={sp.status} currentPriority={sp.priority} />

      {!requests || requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Wrench className="mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Keine Anfragen gefunden</h2>
            <p className="text-sm text-muted-foreground">
              Sobald deine Mieter Mängel melden, erscheinen sie hier.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            // deno-lint-ignore no-explicit-any
            const unit: any = (r as any).tenancies?.units;
            const property = unit?.properties;
            return (
              <Link key={r.id} href={`/dashboard/requests/${r.id}`}>
                <Card className="transition hover:border-primary/40 hover:shadow-sm">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium leading-tight">{r.title}</h3>
                        <PriorityBadge priority={r.priority as RequestPriority} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">
                          {REQUEST_CATEGORY_LABELS_DE[r.category as RequestCategory]}
                        </Badge>
                        <StatusBadge status={r.status as RequestStatus} />
                        {property && (
                          <span>
                            · {property.street} {property.house_number} · {unit?.unit_label}
                            {isAdmin && property.profiles?.full_name && (
                              <> · {property.profiles.full_name}</>
                            )}
                          </span>
                        )}
                        <span>· {relativeTime(r.created_at)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterBar({
  currentStatus,
  currentPriority,
}: {
  currentStatus?: string;
  currentPriority?: string;
}) {
  const statuses: (RequestStatus | 'all')[] = [
    'all',
    'open',
    'in_progress',
    'resolved',
    'closed',
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((s) => {
        const active = (s === 'all' && !currentStatus) || s === currentStatus;
        const params = new URLSearchParams();
        if (s !== 'all') params.set('status', s);
        if (currentPriority) params.set('priority', currentPriority);
        const href = `/dashboard/requests${params.toString() ? `?${params}` : ''}`;
        return (
          <Link
            key={s}
            href={href}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input hover:bg-accent'
            }`}
          >
            {s === 'all' ? 'Alle' : REQUEST_STATUS_LABELS_DE[s]}
          </Link>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const variantMap: Record<RequestStatus, 'default' | 'success' | 'info' | 'secondary' | 'destructive'> = {
    open: 'info',
    in_progress: 'default',
    resolved: 'success',
    closed: 'secondary',
    rejected: 'destructive',
  };
  return <Badge variant={variantMap[status]}>{REQUEST_STATUS_LABELS_DE[status]}</Badge>;
}

function PriorityBadge({ priority }: { priority: RequestPriority }) {
  if (priority === 'urgent') return <Badge variant="destructive">Dringend</Badge>;
  if (priority === 'high') return <Badge variant="warning">Hoch</Badge>;
  if (priority === 'low') return <Badge variant="secondary">Niedrig</Badge>;
  return <Badge variant="outline">Normal</Badge>;
}
