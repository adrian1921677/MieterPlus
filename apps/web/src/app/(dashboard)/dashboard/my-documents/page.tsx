import { redirect } from 'next/navigation';
import { FolderLock } from 'lucide-react';
import { VAULT_DOCUMENT_TYPE_LABELS_DE, type VaultDocumentType } from '@mieterplus/shared';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TenantDocList } from './tenant-doc-list';

export const metadata = { title: 'Meine Dokumente' };

export default async function MyDocumentsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = createSupabaseServiceClient();

  // Properties, in denen der Mieter eine aktive Tenancy hat
  const { data: tenancies } = await service
    .from('tenancies')
    .select('units!inner(property_id)')
    .eq('tenant_id', user.id)
    .is('ended_at', null);

  const propIds = Array.from(
    new Set(
      (tenancies ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((t: any) => t.units?.property_id)
        .filter(Boolean),
    ),
  ) as string[];

  // Freigegebene Dokumente + ob der Mieter sie schon geöffnet hat
  const { data: docs } = propIds.length
    ? await service
        .from('vault_documents')
        .select('id, type, title, created_at, document_access_log(viewer_id, created_at)')
        .in('property_id', propIds)
        .eq('visible_to_tenant', true)
        .order('created_at', { ascending: false })
    : { data: [] };

  const documents = (docs ?? []).map((d) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dd: any = d;
    const myAccess = (dd.document_access_log ?? []).find(
      (a: Record<string, unknown>) => a.viewer_id === user.id,
    );
    return {
      id: dd.id as string,
      type: dd.type as VaultDocumentType,
      title: dd.title as string,
      createdAt: dd.created_at as string,
      openedAt: (myAccess?.created_at as string) ?? null,
    };
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FolderLock className="h-6 w-6 text-[#2563a8]" />
          Meine Dokumente
        </h1>
        <p className="text-muted-foreground">
          Dokumente, die dein Vermieter mit dir geteilt hat.
        </p>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Keine Dokumente</CardTitle>
            <CardDescription>
              Dein Vermieter hat bisher keine Dokumente für dich freigegeben.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <TenantDocList documents={documents} labels={VAULT_DOCUMENT_TYPE_LABELS_DE} />
      )}
    </div>
  );
}
