import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FolderLock, Sparkles } from 'lucide-react';
import {
  PLAN_LIMITS,
  VAULT_DOCUMENT_TYPE_LABELS_DE,
  type VaultDocumentType,
} from '@mieterplus/shared';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { getSubscription } from '@/lib/subscription';
import { getPropertyAccess, propertyIdsWithPermission } from '@/lib/access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VaultManager } from './vault-manager';

export const metadata = { title: 'Dokumenten-Tresor' };

export default async function VaultPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  const service = createSupabaseServiceClient();
  const access = await getPropertyAccess(service, user.id);

  // Vermieter & Admins dürfen die Seite immer öffnen (ohne Immobilie sehen sie
  // unten einen Hinweis). Nur sonstige Rollen (z. B. Mieter) ohne Objekt-Zugriff
  // werden umgeleitet — kein stummer Redirect mehr für Vermieter ohne Immobilie.
  const uploadableIds = propertyIdsWithPermission(access, 'vault');
  const mayAccessVault =
    profile?.role === 'landlord' || profile?.role === 'admin' || access.allIds.length > 0;
  if (!mayAccessVault) redirect('/dashboard');

  const sub = await getSubscription(supabase, user.id);
  const quota = PLAN_LIMITS[sub.plan].vaultDocs;

  // Alle zugänglichen Immobilien (eigene + verwaltete) für Anzeige
  const { data: properties } = await service
    .from('properties')
    .select('id, street, house_number, postal_code, city')
    .in('id', access.allIds.length ? access.allIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false });

  // Dokumente über alle zugänglichen Objekte
  const propIds = access.allIds;

  // Dokumente + Lesebestätigungen
  const { data: docs } = propIds.length
    ? await service
        .from('vault_documents')
        .select(
          'id, property_id, type, title, mime_type, visible_to_tenant, created_at, ' +
            'document_access_log(viewer_id, action, created_at, profiles:viewer_id(full_name))',
        )
        .in('property_id', propIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  // Quota zählt nur eigene Dokumente (verwaltete Objekte zählen zum Kontingent des Eigentümers)
  const ownedSet = new Set(access.ownedIds);
  const usedCount = (docs ?? []).filter((d) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ownedSet.has((d as any).property_id),
  ).length;
  const showQuota = access.ownedIds.length > 0;

  // Upload nur in Objekte mit Berechtigung (eigene oder verwaltet mit 'vault')
  const uploadSet = new Set(uploadableIds);
  const propertyOptions = (properties ?? [])
    .filter((p) => uploadSet.has(p.id))
    .map((p) => ({
      id: p.id,
      label: `${p.street} ${p.house_number}, ${p.postal_code} ${p.city}`,
    }));

  // Dokumente in serialisierbare Form bringen
  const documents = (docs ?? []).map((d) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dd: any = d;
    const accesses = (dd.document_access_log ?? []).map((a: Record<string, unknown>) => ({
      viewerName: (a.profiles as { full_name?: string } | null)?.full_name ?? 'Mieter',
      action: a.action as string,
      at: a.created_at as string,
    }));
    return {
      id: dd.id as string,
      propertyId: dd.property_id as string,
      type: dd.type as VaultDocumentType,
      title: dd.title as string,
      visibleToTenant: dd.visible_to_tenant as boolean,
      createdAt: dd.created_at as string,
      accesses,
    };
  });

  const propLabelById = new Map(
    (properties ?? []).map((p) => [
      p.id,
      `${p.street} ${p.house_number}, ${p.postal_code} ${p.city}`,
    ]),
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FolderLock className="h-6 w-6 text-[#2563a8]" />
          Dokumenten-Tresor
        </h1>
        <p className="text-muted-foreground">
          Mietverträge, Nebenkostenabrechnungen und Hausordnungen sicher teilen — mit
          Lesebestätigung.
        </p>
      </div>

      {/* Quota-Anzeige (nur für Eigentümer) */}
      {showQuota && (
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">
                {usedCount} / {quota} Dokumenten belegt
              </span>
              <span className="text-xs text-muted-foreground">
                {sub.plan === 'free' ? 'Free-Kontingent' : sub.plan === 'plus' ? 'Plus-Kontingent' : 'Pro-Kontingent'}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-[#2563a8]"
                style={{ width: `${Math.min(100, (usedCount / quota) * 100)}%` }}
              />
            </div>
          </div>
          {sub.plan !== 'pro' && (
            <Link
              href="/dashboard/upgrade"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#2563a8] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1d4f8c]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Mehr mit Plus / Pro
            </Link>
          )}
        </CardContent>
      </Card>
      )}

      {propertyOptions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Noch keine Immobilie</CardTitle>
            <CardDescription>
              Lege zuerst eine Immobilie an, um Dokumente sicher mit deinen Mietern zu teilen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/properties/new">Immobilie hinzufügen</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <VaultManager
          propertyOptions={propertyOptions}
          documents={documents}
          propLabels={Object.fromEntries(propLabelById)}
          quotaReached={usedCount >= quota}
          labels={VAULT_DOCUMENT_TYPE_LABELS_DE}
        />
      )}
    </div>
  );
}
