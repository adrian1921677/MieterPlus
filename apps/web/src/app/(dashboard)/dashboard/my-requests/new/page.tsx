import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NewRequestForm } from './new-request-form';

export const metadata = { title: 'Mangel melden' };

export default async function NewMyRequestPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Verifizierte Tenancies mit Adresse + Unit-Label laden
  const { data: tenancies } = await supabase
    .from('tenancies')
    .select(
      'id, unit:units(id, unit_label, property:properties(street, house_number, postal_code, city))',
    )
    .eq('tenant_id', user.id)
    .not('verified_at', 'is', null);

  if (!tenancies || tenancies.length === 0) {
    return (
      <Card className="mx-auto max-w-md">
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

  // Optionen für das Tenancy-Dropdown
  const tenancyOptions = tenancies.map((t) => {
    const unit = Array.isArray(t.unit) ? t.unit[0] : t.unit;
    const prop = unit ? (Array.isArray(unit.property) ? unit.property[0] : unit.property) : null;
    const label = prop
      ? `${prop.street} ${prop.house_number}, ${prop.postal_code} ${prop.city}${
          unit?.unit_label ? ' · ' + unit.unit_label : ''
        }`
      : 'Unbekannte Adresse';
    return { id: t.id, label };
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Neuen Mangel melden</h1>
        <p className="text-muted-foreground">
          Beschreibe das Problem so genau wie möglich. Dein Vermieter wird benachrichtigt.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <NewRequestForm tenancyOptions={tenancyOptions} />
        </CardContent>
      </Card>
    </div>
  );
}
