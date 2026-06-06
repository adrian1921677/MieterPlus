import { Users2 } from 'lucide-react';
import {
  MANAGER_PERMISSIONS,
  MANAGER_PERMISSION_LABELS_DE,
} from '@mieterplus/shared';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AcceptInviteButton } from './accept-invite-button';

/**
 * Zeigt offene Hausverwaltungs-Einladungen für den eingeloggten User
 * (gematcht über die E-Mail-Adresse). Rendert nichts, wenn keine offen sind.
 */
export async function PendingManagerInvites() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const service = createSupabaseServiceClient();
  const { data: invites } = await service
    .from('property_managers')
    .select('id, permissions, owner_id, profiles:owner_id(full_name), property_manager_properties(property_id)')
    .ilike('invite_email', user.email)
    .eq('status', 'pending')
    .is('manager_id', null);

  if (!invites || invites.length === 0) return null;

  return (
    <div className="space-y-3">
      {invites.map((inv) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ii: any = inv;
        const ownerName = ii.profiles?.full_name ?? 'Ein Eigentümer';
        const propCount = (ii.property_manager_properties ?? []).length;
        const perms = MANAGER_PERMISSIONS.filter((p) => ii.permissions?.[p]);
        return (
          <Card key={ii.id} className="border-2 border-[#2563a8]/40 bg-[#eff6ff]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-[#1d4f8c]">
                <Users2 className="h-5 w-5" />
                Einladung zur Hausverwaltung
              </CardTitle>
              <CardDescription>
                <strong>{ownerName}</strong> möchte dich als Hausverwaltung für {propCount}{' '}
                Immobilie(n) hinzufügen. Rechte:{' '}
                {perms.map((p) => MANAGER_PERMISSION_LABELS_DE[p]).join(', ') || '—'}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AcceptInviteButton assignmentId={ii.id} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
