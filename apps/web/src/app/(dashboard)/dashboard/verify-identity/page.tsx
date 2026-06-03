import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { IdentityUploader } from './identity-uploader';

export const metadata = { title: 'Identität verifizieren' };

export default async function VerifyIdentityPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, identity_verified_at, identity_rejection_reason')
    .eq('id', user.id)
    .single();
  if (!profile) redirect('/login');

  const { data: existingDocs } = await supabase
    .from('identity_documents')
    .select('id, document_side, file_path, uploaded_at')
    .eq('user_id', user.id)
    .order('uploaded_at');

  const isVerified = !!profile.identity_verified_at;
  const hasUploaded = (existingDocs?.length ?? 0) >= 2;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Identität verifizieren</h1>
        <p className="text-muted-foreground">
          Bevor du Immobilien anlegen kannst, prüfen wir deine Identität anhand deines
          Personalausweises.
        </p>
      </div>

      {isVerified && (
        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <VerifiedBadge size={28} />
            <div>
              <div className="font-medium">Identität bestätigt</div>
              <div className="text-sm text-muted-foreground">
                Du kannst jetzt beliebig viele Immobilien hinzufügen.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isVerified && hasUploaded && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 text-sm">
            <Badge variant="warning">In Prüfung</Badge>
            <p className="mt-2">
              Deine Dokumente sind hochgeladen und werden von unserem Team geprüft.
              Du wirst per E-Mail informiert.
            </p>
          </CardContent>
        </Card>
      )}

      {profile.identity_rejection_reason && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6">
            <Badge variant="destructive">Abgelehnt</Badge>
            <p className="mt-2 text-sm">
              <strong>Grund:</strong> {profile.identity_rejection_reason}
            </p>
            <p className="mt-2 text-sm">
              Bitte lade aktuelle, gut lesbare Bilder neu hoch.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Personalausweis hochladen</CardTitle>
          <CardDescription>
            Vorder- und Rückseite. JPG, PNG oder PDF, max. 10 MB. Du darfst Seriennummer
            und Zugangsnummer schwärzen (§20 PAuswG).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IdentityUploader
            userId={user.id}
            initialDocs={existingDocs ?? []}
            canEdit={!isVerified}
          />
        </CardContent>
      </Card>

      <div className="rounded-md border bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong>Datenschutz:</strong> Wir speichern die Bilder verschlüsselt und löschen sie
        automatisch 30 Tage nach erfolgreicher Verifikation. Sie werden ausschließlich zur
        Identitätsprüfung verwendet — niemals weitergegeben oder für andere Zwecke genutzt.
      </div>
    </div>
  );
}
