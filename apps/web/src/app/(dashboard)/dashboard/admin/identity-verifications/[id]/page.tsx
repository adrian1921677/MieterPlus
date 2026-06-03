import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { IdentityReviewActions } from './identity-review-actions';
import { IdentityPreview } from './identity-preview';

export const metadata = { title: 'Identitäts-Prüfung' };

export default async function IdentityVerificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') redirect('/dashboard');

  const { data: target } = await supabase
    .from('profiles')
    .select('id, full_name, role, phone, identity_verified_at, identity_rejection_reason, created_at')
    .eq('id', id)
    .single();
  if (!target) notFound();

  const { data: docs } = await supabase
    .from('identity_documents')
    .select('id, document_side, file_path, uploaded_at')
    .eq('user_id', id)
    .order('document_side');

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard/admin/identity-verifications">
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Liste
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">{target.full_name}</h1>
        <p className="text-muted-foreground">
          Rolle: {target.role === 'landlord' ? 'Vermieter' : target.role} · Registriert am{' '}
          {formatDate(target.created_at)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil-Daten</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Name laut Profil</dt>
            <dd className="font-medium">{target.full_name}</dd>
            <dt className="text-muted-foreground">Telefon</dt>
            <dd>{target.phone ?? '—'}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personalausweis</CardTitle>
          <CardDescription>
            Prüfe, ob der Name auf dem Ausweis mit dem Profil-Namen oben übereinstimmt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IdentityPreview docs={docs ?? []} />
        </CardContent>
      </Card>

      <IdentityReviewActions userId={target.id} />
    </div>
  );
}
