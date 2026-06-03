import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { DocumentUploader } from './document-uploader';
import { UnitsSection } from './units-section';

export const metadata = { title: 'Immobilie' };

export default async function PropertyDetailPage({
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

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (!property) notFound();

  const { data: documents } = await supabase
    .from('ownership_documents')
    .select('id, file_path, document_type, created_at')
    .eq('property_id', id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href="/dashboard/properties">
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Übersicht
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <span>
                {property.street} {property.house_number}
              </span>
              {property.ownership_status === 'verified' && <VerifiedBadge size={24} />}
            </h1>
            <p className="text-muted-foreground">
              {property.postal_code} {property.city}
            </p>
          </div>
          {property.ownership_status !== 'verified' && (
            <StatusBadge status={property.ownership_status} />
          )}
        </div>
      </div>

      {property.ownership_status === 'pending' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Deine Immobilie wartet auf Freigabe. Sobald unser Team deine Dokumente geprüft hat,
          kannst du Wohneinheiten anlegen und Mieter einladen.
        </div>
      )}

      {property.ownership_status === 'rejected' && property.rejection_reason && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <strong>Eigentumsnachweis abgelehnt:</strong> {property.rejection_reason}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Eigentumsnachweise</CardTitle>
          <CardDescription>
            Lade Grundbuchauszug, Notarurkunde oder Kaufvertrag hoch (PDF oder Bild, max. 20 MB).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUploader
            propertyId={property.id}
            initialDocuments={documents ?? []}
            canUpload={property.ownership_status !== 'verified'}
          />
        </CardContent>
      </Card>

      {property.ownership_status === 'verified' && <UnitsSection propertyId={property.id} />}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'verified') return <Badge variant="success">Verifiziert</Badge>;
  if (status === 'rejected') return <Badge variant="destructive">Abgelehnt</Badge>;
  return <Badge variant="warning">In Prüfung</Badge>;
}
