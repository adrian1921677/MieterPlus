import { FileSignature } from 'lucide-react';
import { PremiumGate } from '@/components/premium-gate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Übergabeprotokoll' };

export default function HandoverPage() {
  return (
    <PremiumGate feature="Übergabeprotokoll">
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FileSignature className="h-6 w-6 text-[#2563a8]" />
            Digitales Übergabeprotokoll
          </h1>
          <p className="text-muted-foreground">
            Zählerstände, Schlüssel, Raum-für-Raum-Dokumentation mit Foto, digitale Unterschrift
            und PDF.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Wird gerade fertiggestellt</CardTitle>
            <CardDescription>
              Dieses Premium-Feature wird in Kürze hier verfügbar sein. Du hast bereits Zugriff —
              das vollständige Modul folgt im nächsten Update.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Geplant: dynamisches Formular, Foto-Upload pro Raum, Canvas-Unterschrift für Mieter
            &amp; Vermieter, automatische PDF-Erstellung.
          </CardContent>
        </Card>
      </div>
    </PremiumGate>
  );
}
