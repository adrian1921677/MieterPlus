import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { DocumentUploader } from '../../../properties/[id]/document-uploader';
import { ReviewActions } from './review-actions';

export const metadata = { title: 'Eigentumsprüfung' };

export default async function VerificationDetailPage({
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

  const { data: property } = await supabase
    .from('properties')
    .select('*, profiles:owner_id(full_name, phone)')
    .eq('id', id)
    .single();

  if (!property) notFound();

  const { data: documents } = await supabase
    .from('ownership_documents')
    .select('id, file_path, document_type, created_at')
    .eq('property_id', id)
    .order('created_at', { ascending: false });

  // deno-lint-ignore no-explicit-any
  const ownerProfile: any = (property as any).profiles;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard/admin/verifications">
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Liste
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">
          {property.street} {property.house_number}
        </h1>
        <p className="text-muted-foreground">
          {property.postal_code} {property.city} · Eingereicht am{' '}
          {formatDate(property.created_at)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Antragsteller</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{ownerProfile?.full_name ?? '—'}</dd>
            <dt className="text-muted-foreground">Telefon</dt>
            <dd>{ownerProfile?.phone ?? '—'}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eigentumsnachweise</CardTitle>
          <CardDescription>Prüfe die hochgeladenen Dokumente.</CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUploader propertyId={property.id} initialDocuments={documents ?? []} canUpload={false} />
        </CardContent>
      </Card>

      <ReviewActions propertyId={property.id} />
    </div>
  );
}
