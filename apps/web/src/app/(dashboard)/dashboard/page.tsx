import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Building2, Wrench, ShieldCheck, AlertTriangle } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PropertyMap } from '@/components/property-map';
import { PendingManagerInvites } from './pending-invites';

export const metadata = { title: 'Übersicht' };

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  if (profile.role === 'tenant') {
    // Aktive Tenancies des Mieters laden (inkl. Wohnung + Adresse via unit → property)
    // "aktiv" = ended_at IS NULL (kein verified_at-Feld in der DB)
    const { data: tenancies } = await supabase
      .from('tenancies')
      .select(
        'id, started_at, unit:units(id, unit_label, property:properties(street, house_number, postal_code, city))',
      )
      .eq('tenant_id', user.id)
      .is('ended_at', null);

    const verifiedTenancies = tenancies ?? [];

    // Mängel-Statistik
    const tenancyIds = verifiedTenancies.map((t) => t.id);
    const { count: openMyRequests } = tenancyIds.length
      ? await supabase
          .from('requests')
          .select('id', { count: 'exact', head: true })
          .in('tenancy_id', tenancyIds)
          .in('status', ['open', 'in_progress'])
      : { count: 0 };

    // Übergabeprotokolle, die noch auf die Unterschrift des Mieters warten
    const { data: pendingHandovers } = tenancyIds.length
      ? await supabase
          .from('handover_protocols')
          .select('id, type')
          .in('tenancy_id', tenancyIds)
          .neq('status', 'completed')
          .is('tenant_signed_at', null)
      : { data: [] };

    return (
      <div className="space-y-6">
        <PendingManagerInvites />
        <div>
          <h1 className="text-2xl font-bold">Hallo {profile.full_name}!</h1>
          <p className="text-muted-foreground">Schön, dass du da bist.</p>
        </div>

        {pendingHandovers && pendingHandovers.length > 0 && (
          <Card className="border-2 border-[#2563a8]/40 bg-[#eff6ff]">
            <CardHeader>
              <CardTitle className="text-base text-[#1d4f8c]">
                Übergabeprotokoll wartet auf deine Unterschrift
              </CardTitle>
              <CardDescription>
                Dein Vermieter hat ein Übergabeprotokoll erstellt. Bitte prüfe es und unterschreibe
                digital.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {pendingHandovers.map((h) => (
                <Button key={h.id} asChild variant="default" className="w-full sm:w-auto">
                  <Link href={`/dashboard/handover/${h.id}`}>Protokoll ansehen &amp; unterschreiben</Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {verifiedTenancies.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Erste Schritte: Wohnung verknüpfen</CardTitle>
              <CardDescription>
                Du brauchst einen 12-stelligen Einladungscode von deinem Vermieter, um dich
                einer Wohnung zuzuordnen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/join">Code eingeben</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <StatCard
                title="Meine Wohnungen"
                value={verifiedTenancies.length}
                icon={<Building2 className="h-4 w-4" />}
              />
              <StatCard
                title="Offene Mängel"
                value={openMyRequests ?? 0}
                icon={<Wrench className="h-4 w-4" />}
                href="/dashboard/my-requests"
              />
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Meine Wohnungen</CardTitle>
                    <CardDescription>
                      Hier siehst du alle Wohnungen, die dir zugeordnet sind.
                    </CardDescription>
                  </div>
                  <Button asChild size="sm">
                    <Link href="/dashboard/my-requests/new">Mangel melden</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {verifiedTenancies.map((t) => {
                  const unit = Array.isArray(t.unit) ? t.unit[0] : t.unit;
                  const prop = unit ? (Array.isArray(unit.property) ? unit.property[0] : unit.property) : null;
                  return (
                    <div
                      key={t.id}
                      className="overflow-hidden rounded-md border border-zinc-200 bg-white"
                    >
                      {prop && (
                        <PropertyMap
                          street={prop.street}
                          house_number={prop.house_number}
                          postal_code={prop.postal_code}
                          city={prop.city}
                          width={700}
                          height={180}
                          zoom={15}
                          className="!rounded-none border-0 border-b border-zinc-200"
                        />
                      )}
                      <div className="p-4">
                        <div className="font-medium">
                          {prop ? `${prop.street} ${prop.house_number}` : 'Unbekannte Adresse'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {prop ? `${prop.postal_code} ${prop.city}` : ''}
                          {unit?.unit_label ? ` · ${unit.unit_label}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  if (profile.role === 'admin') {
    const { count: pendingProperties } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('ownership_status', 'pending');
    return (
      <div className="space-y-6">
        <PendingManagerInvites />
        <h1 className="text-2xl font-bold">Hallo {profile.full_name}</h1>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Offene Eigentumsprüfungen</CardTitle>
                <CardDescription>
                  Vermieter warten auf Freigabe ihrer Immobilien.
                </CardDescription>
              </div>
              <Badge variant={(pendingProperties ?? 0) > 0 ? 'warning' : 'secondary'}>
                {pendingProperties ?? 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/admin/verifications">Verifikationen prüfen</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [{ count: propertyCount }, { count: pendingPropCount }, { count: openRequests }, { count: urgentRequests }] = await Promise.all([
    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id),
    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('ownership_status', 'pending'),
    supabase
      .from('requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress']),
    supabase
      .from('requests')
      .select('id', { count: 'exact', head: true })
      .eq('priority', 'urgent')
      .in('status', ['open', 'in_progress']),
  ]);

  // Statistik-Daten (RLS scoped auf eigene + verwaltete Mängel)
  const { data: statReqs } = await supabase
    .from('requests')
    .select('status, created_at, closed_at, resolution_rating');
  const reqs = statReqs ?? [];
  const total = reqs.length;
  const closedReqs = reqs.filter((r) => r.status === 'closed' && r.closed_at);
  const resolvedShare = total > 0 ? Math.round((closedReqs.length / total) * 100) : 0;
  // Ø Bearbeitungsdauer in Tagen
  const avgDays =
    closedReqs.length > 0
      ? Math.round(
          (closedReqs.reduce(
            (sum, r) =>
              sum + (new Date(r.closed_at!).getTime() - new Date(r.created_at).getTime()),
            0,
          ) /
            closedReqs.length /
            (1000 * 60 * 60 * 24)) *
            10,
        ) / 10
      : null;
  const rated = reqs.filter((r) => r.resolution_rating);
  const avgRating =
    rated.length > 0
      ? Math.round((rated.reduce((s, r) => s + (r.resolution_rating ?? 0), 0) / rated.length) * 10) /
        10
      : null;
  const statusCounts = {
    open: reqs.filter((r) => r.status === 'open').length,
    in_progress: reqs.filter((r) => r.status === 'in_progress').length,
    resolved: reqs.filter((r) => r.status === 'resolved').length,
    closed: reqs.filter((r) => r.status === 'closed').length,
  };

  return (
    <div className="space-y-6">
      <PendingManagerInvites />
      <div>
        <h1 className="text-2xl font-bold">Willkommen, {profile.full_name}</h1>
        <p className="text-muted-foreground">Hier ist dein aktueller Überblick.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Immobilien"
          value={propertyCount ?? 0}
          icon={<Building2 className="h-4 w-4" />}
          href="/dashboard/properties"
        />
        <StatCard
          title="Davon ausstehend"
          value={pendingPropCount ?? 0}
          icon={<ShieldCheck className="h-4 w-4" />}
          variant={(pendingPropCount ?? 0) > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="Offene Mängel"
          value={openRequests ?? 0}
          icon={<Wrench className="h-4 w-4" />}
          href="/dashboard/requests"
        />
        <StatCard
          title="Dringende Mängel"
          value={urgentRequests ?? 0}
          icon={<AlertTriangle className="h-4 w-4" />}
          href="/dashboard/requests?priority=urgent"
          variant={(urgentRequests ?? 0) > 0 ? 'destructive' : 'default'}
        />
      </div>

      {/* Statistik */}
      {total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Statistik</CardTitle>
            <CardDescription>Auswertung deiner Mängelmeldungen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-2xl font-black text-brand">{resolvedShare}%</div>
                <div className="text-xs text-muted-foreground">erledigt &amp; archiviert</div>
              </div>
              <div>
                <div className="text-2xl font-black text-brand">
                  {avgDays !== null ? `${avgDays} Tage` : '—'}
                </div>
                <div className="text-xs text-muted-foreground">Ø Bearbeitungsdauer</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-2xl font-black text-brand">
                  {avgRating !== null ? avgRating : '—'}
                  {avgRating !== null && <span className="text-amber-400">★</span>}
                </div>
                <div className="text-xs text-muted-foreground">Ø Bewertung</div>
              </div>
            </div>

            {/* Status-Verteilung als Balken */}
            <div className="space-y-2">
              {[
                { key: 'open', label: 'Offen', color: 'bg-amber-400' },
                { key: 'in_progress', label: 'In Bearbeitung', color: 'bg-[#2563a8]' },
                { key: 'resolved', label: 'Behoben (wartet)', color: 'bg-sky-400' },
                { key: 'closed', label: 'Abgeschlossen', color: 'bg-emerald-500' },
              ].map((s) => {
                const val = statusCounts[s.key as keyof typeof statusCounts];
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return (
                  <div key={s.key} className="flex items-center gap-3 text-sm">
                    <span className="w-32 shrink-0 text-muted-foreground">{s.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                      <div className={`h-full rounded-full ${s.color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right font-medium">{val}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Nächste Schritte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(propertyCount ?? 0) === 0 && (
            <Step
              title="Erste Immobilie hinzufügen"
              description="Trage deine Immobilie ein und lade einen Eigentumsnachweis hoch."
              cta="Immobilie hinzufügen"
              href="/dashboard/properties/new"
            />
          )}
          {(pendingPropCount ?? 0) > 0 && (
            <Step
              title="Verifikation läuft"
              description="Wir prüfen deine Eigentumsnachweise. Du wirst per E-Mail informiert."
            />
          )}
          {(propertyCount ?? 0) > 0 && (pendingPropCount ?? 0) < (propertyCount ?? 0) && (
            <Step
              title="Mietern Zugang geben"
              description="Generiere Codes für deine Wohneinheiten und teile sie deinen Mietern mit."
              cta="Zu meinen Immobilien"
              href="/dashboard/properties"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  href,
  variant,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  href?: string;
  variant?: 'default' | 'warning' | 'destructive';
}) {
  const body = (
    <Card
      className={
        variant === 'destructive'
          ? 'border-destructive/40'
          : variant === 'warning'
            ? 'border-amber-300'
            : ''
      }
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Step({
  title,
  description,
  cta,
  href,
}: {
  title: string;
  description: string;
  cta?: string;
  href?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
      {cta && href && (
        <Button asChild size="sm">
          <Link href={href}>{cta}</Link>
        </Button>
      )}
    </div>
  );
}
