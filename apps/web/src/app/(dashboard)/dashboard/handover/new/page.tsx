import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { PremiumGate } from '@/components/premium-gate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NewHandoverForm } from './new-handover-form';

export const metadata = { title: 'Neues Übergabeprotokoll' };

export default async function NewHandoverPage() {
  return (
    <PremiumGate feature="Übergabeprotokoll">
      <NewHandoverInner />
    </PremiumGate>
  );
}

async function NewHandoverInner() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Aktive Mietverhältnisse dieses Vermieters laden
  const service = createSupabaseServiceClient();
  const { data: tenancies } = await service
    .from('tenancies')
    .select(
      'id, profiles:tenant_id(full_name), units!inner(unit_label, properties!inner(street, house_number, postal_code, city, owner_id))',
    )
    .eq('units.properties.owner_id', user.id)
    .is('ended_at', null);

  const options = (tenancies ?? []).map((t) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tt: any = t;
    const prop = tt.units?.properties;
    const label = `${prop?.street ?? ''} ${prop?.house_number ?? ''}${
      tt.units?.unit_label ? ' · ' + tt.units.unit_label : ''
    } — ${tt.profiles?.full_name ?? 'Mieter'}`;
    return { id: tt.id as string, label };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/dashboard/handover">
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Neues Übergabeprotokoll</h1>
        <p className="text-muted-foreground">
          Erfasse Zählerstände, Schlüssel und den Zustand pro Raum. Unterschrieben wird im
          nächsten Schritt.
        </p>
      </div>

      {options.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Kein aktiver Mieter gefunden</CardTitle>
            <CardDescription>
              Du brauchst mindestens ein aktives Mietverhältnis (verifizierte Immobilie + Mieter
              mit eingelöstem Code), um ein Protokoll zu erstellen.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <NewHandoverForm tenancyOptions={options} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
