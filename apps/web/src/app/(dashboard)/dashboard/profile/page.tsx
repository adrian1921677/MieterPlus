import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Mein Profil' };

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, phone, created_at, identity_verified_at')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  const roleLabel =
    profile.role === 'tenant' ? 'Mieter' : profile.role === 'landlord' ? 'Vermieter' : 'Administrator';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mein Profil</h1>
        <p className="text-muted-foreground">Deine Konto-Informationen.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Persönliche Daten</CardTitle>
          <CardDescription>Diese Daten kannst du in Kürze direkt hier ändern.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row label="Name" value={profile.full_name} />
          <Row label="E-Mail" value={user.email ?? '—'} />
          <Row label="Telefon" value={profile.phone ?? '—'} />
          <Row
            label="Rolle"
            value={
              <Badge variant={profile.role === 'admin' ? 'destructive' : 'secondary'}>
                {roleLabel}
              </Badge>
            }
          />
          <Row
            label="Identität verifiziert"
            value={profile.identity_verified_at ? '✓ Ja' : 'Nein'}
          />
          <Row
            label="Konto erstellt"
            value={new Date(profile.created_at).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-zinc-100 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
