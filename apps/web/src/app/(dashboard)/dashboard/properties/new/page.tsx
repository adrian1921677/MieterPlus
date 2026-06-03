import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NewPropertyForm } from './new-property-form';

export const metadata = { title: 'Neue Immobilie' };

export default async function NewPropertyPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, identity_verified_at')
    .eq('id', user.id)
    .single();

  // Admin darf ohne Identitätsprüfung
  if (profile?.role !== 'admin' && !profile?.identity_verified_at) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-amber-600" />
              <div>
                <CardTitle>Identität nicht verifiziert</CardTitle>
                <CardDescription>
                  Bevor du Immobilien anlegen kannst, müssen wir deine Identität anhand
                  deines Personalausweises prüfen.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/verify-identity">Jetzt Identität verifizieren</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Neue Immobilie</CardTitle>
          <CardDescription>
            Trage die Adresse deiner Immobilie ein. Nach dem Speichern lädst du den
            Eigentumsnachweis hoch (z.B. Grundbuchauszug). Unser Team prüft und gibt frei.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewPropertyForm />
        </CardContent>
      </Card>
    </div>
  );
}
