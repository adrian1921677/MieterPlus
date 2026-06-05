import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, AlertTriangle, Wrench, CheckCircle2, Archive } from 'lucide-react';
import {
  REQUEST_CATEGORY_LABELS_DE,
  REQUEST_PRIORITY_LABELS_DE,
  type RequestCategory,
  type RequestPriority,
} from '@mieterplus/shared';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStatusStyle, isActive } from '@/lib/request-status';

export const metadata = { title: 'Meine Mängel' };

function priorityVariant(priority: RequestPriority): 'destructive' | 'warning' | 'secondary' {
  if (priority === 'urgent') return 'destructive';
  if (priority === 'high') return 'warning';
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

  const all = requests ?? [];
  const open = all.filter((r) => r.status === 'open').length;
  const inProgress = all.filter((r) => r.status === 'in_progress').length;
  const resolved = all.filter((r) => r.status === 'resolved').length;
  const closed = all.filter((r) => r.status === 'closed' || r.status === 'rejected').length;

  // Aktive Mängel zuerst, archivierte am Ende
  const sorted = [...all].sort((a, b) => {
    if (isActive(a.status) && !isActive(b.status)) return -1;
    if (!isActive(a.status) && isActive(b.status)) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meine Mängel</h1>
          <p className="text-muted-foreground">Alle deine gemeldeten Mängel auf einen Blick.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/my-requests/new">
            <Plus className="h-4 w-4" />
            Neuen Mangel melden
          </Link>
        </Button>
      </div>

      {/* ── Stats-Karten ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Offen"
          value={open}
          icon={<AlertTriangle className="h-4 w-4" />}
          dotClass="bg-amber-400"
          highlight={open > 0}
        />
        <StatCard
          label="In Bearbeitung"
          value={inProgress}
          icon={<Wrench className="h-4 w-4" />}
          dotClass="bg-[#2563a8]"
        />
        <StatCard
          label="Wartet auf Bestätigung"
          value={resolved}
          icon={<CheckCircle2 className="h-4 w-4" />}
          dotClass="bg-indigo-500"
          highlight={resolved > 0}
        />
        <StatCard
          label="Archiviert"
          value={closed}
          icon={<Archive className="h-4 w-4" />}
          dotClass="bg-zinc-400"
        />
      </div>

      {/* ── Liste ─────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
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
          {sorted.map((r) => {
            const style = getStatusStyle(r.status);
            const archived = !isActive(r.status);
            return (
              <li key={r.id}>
                <Link href={`/dashboard/requests/${r.id}`}>
                  <Card
                    className={`border-l-4 transition-all hover:shadow-card-hover ${style.ring} ${
                      archived ? 'opacity-70' : ''
                    }`}
                  >
                    <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            aria-hidden
                            className={`inline-block h-2 w-2 rounded-full ${style.dot}`}
                          />
                          <span className="font-semibold">{r.title}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline">
                            {REQUEST_CATEGORY_LABELS_DE[r.category as RequestCategory]}
                          </Badge>
                          <Badge variant={priorityVariant(r.priority as RequestPriority)}>
                            {REQUEST_PRIORITY_LABELS_DE[r.priority as RequestPriority]}
                          </Badge>
                          <Badge variant={style.badge}>{style.label}</Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString('de-DE')}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  dotClass,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  dotClass: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`transition-all ${highlight && value > 0 ? 'border-2' : ''}`}
    >
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
            {label}
          </div>
          <div className="mt-1 text-2xl font-bold">{value}</div>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}
