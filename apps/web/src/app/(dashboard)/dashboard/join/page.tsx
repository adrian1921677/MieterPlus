import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { JoinForm } from './join-form';

export const metadata = { title: 'Wohnung verknüpfen' };

export default async function JoinPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="mx-auto max-w-md space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Wohnung verknüpfen</CardTitle>
          <CardDescription>
            Gib den 12-stelligen Einladungscode ein, den du von deinem Vermieter erhalten hast.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JoinForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Noch keinen Code? Frage deinen Vermieter — er kann ihn in Mieter + für deine
            Wohnung generieren.
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            <Link href="/dashboard" className="font-medium text-primary hover:underline">
              Zurück zum Dashboard
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
