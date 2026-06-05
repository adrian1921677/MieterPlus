import { FolderLock } from 'lucide-react';
import { PremiumGate } from '@/components/premium-gate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Dokumenten-Tresor' };

export default function VaultPage() {
  return (
    <PremiumGate feature="Dokumenten-Tresor">
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
        <Card>
          <CardHeader>
            <CardTitle>Wird gerade fertiggestellt</CardTitle>
            <CardDescription>
              Dieses Premium-Feature wird in Kürze hier verfügbar sein. Das vollständige Modul
              folgt im nächsten Update.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Geplant: Upload pro Immobilie, Freigabe an Mieter, Audit-Log mit Zeitstempel „gelesen
            am …".
          </CardContent>
        </Card>
      </div>
    </PremiumGate>
  );
}
