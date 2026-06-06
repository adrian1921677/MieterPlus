import { redirect } from 'next/navigation';
import { Users2 } from 'lucide-react';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ManagersClient } from './managers-client';

export const metadata = { title: 'Hausverwaltung' };

export default async function ManagersPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'landlord' && profile?.role !== 'admin') redirect('/dashboard');

  const service = createSupabaseServiceClient();

  const { data: properties } = await service
    .from('properties')
    .select('id, street, house_number, postal_code, city')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  const { data: assignments } = await service
    .from('property_managers')
    .select('id, invite_email, permissions, status, created_at, accepted_at, property_manager_properties(property_id)')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  const propertyOptions = (properties ?? []).map((p) => ({
    id: p.id,
    label: `${p.street} ${p.house_number}, ${p.postal_code} ${p.city}`,
  }));
  const propLabels = Object.fromEntries(propertyOptions.map((p) => [p.id, p.label]));

  const managers = (assignments ?? []).map((a) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aa: any = a;
    return {
      id: aa.id as string,
      email: aa.invite_email as string,
      permissions: aa.permissions ?? {},
      status: aa.status as string,
      createdAt: aa.created_at as string,
      propertyIds: (aa.property_manager_properties ?? []).map(
        (x: { property_id: string }) => x.property_id,
      ),
    };
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users2 className="h-6 w-6 text-[#2563a8]" />
          Hausverwaltung
        </h1>
        <p className="text-muted-foreground">
          Lade eine Hausverwaltung ein und lege fest, welche Immobilien sie sehen und was sie
          verwalten darf.
        </p>
      </div>

      {propertyOptions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Keine Immobilie vorhanden</CardTitle>
            <CardDescription>
              Lege zuerst eine Immobilie an, um eine Hausverwaltung einzuladen.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ManagersClient
          propertyOptions={propertyOptions}
          propLabels={propLabels}
          managers={managers}
        />
      )}
    </div>
  );
}
