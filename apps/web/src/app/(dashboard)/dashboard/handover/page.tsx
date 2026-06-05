import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileSignature, Plus, CheckCircle2, Clock, FileText } from 'lucide-react';
import { HANDOVER_TYPE_LABELS_DE, type HandoverType } from '@mieterplus/shared';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { PremiumGate } from '@/components/premium-gate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Übergabeprotokolle' };

export default async function HandoverPage() {
  return (
    <PremiumGate feature="Übergabeprotokoll">
      <HandoverList />
    </PremiumGate>
  );
}

async function HandoverList() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = createSupabaseServiceClient();
  // Protokolle dieses Vermieters (über Tenancy → Unit → Property.owner)
  const { data: protocols } = await service
    .from('handover_protocols')
    .select(
      'id, type, status, created_at, tenancies!inner(tenant_id, profiles:tenant_id(full_name), units!inner(unit_label, properties!inner(street, house_number, owner_id)))',
    )
    .eq('tenancies.units.properties.owner_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FileSignature className="h-6 w-6 text-[#2563a8]" />
            Übergabeprotokolle
          </h1>
          <p className="text-muted-foreground">
            Dokumentiere Ein- und Auszüge rechtssicher mit Foto, Unterschrift und PDF.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/handover/new">
            <Plus className="h-4 w-4" />
            Neues Protokoll
          </Link>
        </Button>
      </div>

      {!protocols || protocols.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Noch keine Protokolle</CardTitle>
            <CardDescription>
              Erstelle dein erstes Übergabeprotokoll für einen Ein- oder Auszug.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {protocols.map((p) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const t: any = (p as any).tenancies;
            const prop = t?.units?.properties;
            return (
              <li key={p.id}>
                <Link href={`/dashboard/handover/${p.id}`}>
                  <Card className="transition-shadow hover:shadow-card-hover">
                    <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-semibold">
                          {prop ? `${prop.street} ${prop.house_number}` : 'Objekt'}
                          {t?.units?.unit_label ? (
                            <span className="text-muted-foreground">· {t.units.unit_label}</span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="outline">
                            {HANDOVER_TYPE_LABELS_DE[p.type as HandoverType]}
                          </Badge>
                          <StatusBadge status={p.status} />
                          <span className="text-muted-foreground">
                            Mieter: {t?.profiles?.full_name ?? '—'}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString('de-DE')}
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

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed')
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" /> Abgeschlossen
      </Badge>
    );
  if (status === 'awaiting_signatures')
    return (
      <Badge variant="info" className="gap-1">
        <Clock className="h-3 w-3" /> Wartet auf Unterschriften
      </Badge>
    );
  return (
    <Badge variant="secondary" className="gap-1">
      <FileText className="h-3 w-3" /> Entwurf
    </Badge>
  );
}
