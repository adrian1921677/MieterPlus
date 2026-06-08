import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProfileForm } from './profile-form';
import { AccountDangerZone } from './account-danger-zone';

export const metadata = { title: 'Mein Profil' };

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'full_name, role, phone, created_at, identity_verified_at, contact_street, contact_house_number, contact_postal_code, contact_city',
    )
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  const roleLabel =
    profile.role === 'tenant'
      ? 'Mieter'
      : profile.role === 'landlord'
        ? 'Vermieter'
        : 'Administrator';

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold">Mein Profil</h1>
        <p className="text-muted-foreground">Verwalte deine persönlichen Angaben.</p>
      </div>

      {/* Konto-Übersicht (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle>Konto</CardTitle>
          <CardDescription>Diese Angaben sind fest mit deinem Login verknüpft.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row label="E-Mail" value={user.email ?? '—'} />
          <Row
            label="Rolle"
            value={
              <Badge variant={profile.role === 'admin' ? 'destructive' : 'secondary'}>
                {roleLabel}
              </Badge>
            }
          />
          <Row
            label="Mitglied seit"
            value={new Date(profile.created_at).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          />
        </CardContent>
      </Card>

      {/* Editierbare persönliche Daten */}
      <Card>
        <CardHeader>
          <CardTitle>Persönliche Daten</CardTitle>
          <CardDescription>Diese Angaben kannst du jederzeit ändern.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initial={{
              full_name: profile.full_name ?? '',
              phone: profile.phone ?? '',
              contact_street: profile.contact_street ?? '',
              contact_house_number: profile.contact_house_number ?? '',
              contact_postal_code: profile.contact_postal_code ?? '',
              contact_city: profile.contact_city ?? '',
            }}
          />
        </CardContent>
      </Card>

      {/* Identitäts-Verifizierung — nur für Vermieter relevant */}
      {profile.role === 'landlord' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent-adb" />
              Identität
            </CardTitle>
            <CardDescription>
              Als Vermieter stärkt eine verifizierte Identität das Vertrauen deiner Mieter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile.identity_verified_at ? (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <BadgeCheck className="h-5 w-5" />
                Deine Identität ist verifiziert.
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-muted-foreground">
                  Deine Identität ist noch nicht verifiziert.
                </span>
                <Button asChild size="sm">
                  <Link href="/dashboard/verify-identity">Jetzt verifizieren</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* DSGVO: Datenauskunft + Konto löschen */}
      <AccountDangerZone />
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
