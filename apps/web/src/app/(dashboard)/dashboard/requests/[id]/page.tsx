import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  REQUEST_CATEGORY_LABELS_DE,
  REQUEST_PRIORITY_LABELS_DE,
  type RequestCategory,
  type RequestPriority,
} from '@mieterplus/shared';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { RequestActions } from './request-actions';
import { CommentThread } from './comment-thread';
import { AttachmentGallery } from './attachment-gallery';

export const metadata = { title: 'Anfrage' };

export default async function RequestDetailPage({
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

  const { data: request } = await supabase
    .from('requests')
    .select(
      'id, title, description, category, priority, status, created_at, tenancy_id, tenancies(unit_id, tenant_id, units(unit_label, property_id, properties(street, house_number, postal_code, city, owner_id)), profiles:tenant_id(full_name))',
    )
    .eq('id', id)
    .single();

  if (!request) notFound();

  // deno-lint-ignore no-explicit-any
  const tenancy: any = (request as any).tenancies;
  const unit = tenancy?.units;
  const property = unit?.properties;
  const tenantProfile = tenancy?.profiles;
  const isTenant = tenancy?.tenant_id === user.id;
  const backHref = isTenant ? '/dashboard/my-requests' : '/dashboard/requests';
  const backLabel = isTenant ? 'Zurück zu meinen Mängeln' : 'Zurück zur Liste';

  const { data: attachments } = await supabase
    .from('request_attachments')
    .select('id, file_path, mime_type, uploaded_by, created_at')
    .eq('request_id', id)
    .order('created_at');

  const { data: comments } = await supabase
    .from('request_comments')
    .select('id, message, created_at, author_id, profiles(full_name, role)')
    .eq('request_id', id)
    .order('created_at');

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={backHref}>
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      </Button>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {REQUEST_CATEGORY_LABELS_DE[request.category as RequestCategory]}
          </Badge>
          <PriorityBadge priority={request.priority as RequestPriority} />
        </div>
        <h1 className="text-2xl font-bold">{request.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Eingereicht von <strong>{tenantProfile?.full_name ?? 'Mieter'}</strong> am{' '}
          {formatDate(request.created_at)}
          {property && (
            <>
              {' '}
              · {property.street} {property.house_number}, {property.postal_code} {property.city},{' '}
              {unit?.unit_label}
            </>
          )}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Beschreibung</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm">{request.description}</CardContent>
      </Card>

      {(attachments?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anhänge</CardTitle>
          </CardHeader>
          <CardContent>
            <AttachmentGallery attachments={attachments ?? []} />
          </CardContent>
        </Card>
      )}

      <RequestActions
        requestId={request.id}
        currentStatus={request.status}
        isLandlord={property?.owner_id === user.id}
        isTenant={isTenant}
      />

      <CommentThread
        requestId={request.id}
        currentUserId={user.id}
        initialComments={
          comments?.map((c) => ({
            id: c.id,
            message: c.message,
            created_at: c.created_at,
            author_id: c.author_id,
            // deno-lint-ignore no-explicit-any
            author_name: (c as any).profiles?.full_name ?? 'Unbekannt',
            // deno-lint-ignore no-explicit-any
            author_role: (c as any).profiles?.role ?? 'tenant',
          })) ?? []
        }
      />
    </div>
  );
}

function PriorityBadge({ priority }: { priority: RequestPriority }) {
  if (priority === 'urgent') return <Badge variant="destructive">Dringend</Badge>;
  if (priority === 'high') return <Badge variant="warning">Hoch</Badge>;
  if (priority === 'low') return <Badge variant="secondary">Niedrig</Badge>;
  return <Badge variant="outline">{REQUEST_PRIORITY_LABELS_DE[priority]}</Badge>;
}
