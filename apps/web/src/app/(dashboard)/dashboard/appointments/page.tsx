import { CalendarClock } from 'lucide-react';
import { PremiumGate } from '@/components/premium-gate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Terminplaner' };

export default function AppointmentsPage() {
  return (
    <PremiumGate feature="Terminplaner">
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <CalendarClock className="h-6 w-6 text-[#2563a8]" />
            Terminplaner
          </h1>
          <p className="text-muted-foreground">
            Freie Zeit-Slots für Reparaturen oder Besichtigungen anbieten — Mieter buchen mit
            einem Klick.
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
            Geplant: Slot-Verwaltung, 1-Klick-Buchung für Mieter, automatische Benachrichtigung
            per E-Mail &amp; Push.
          </CardContent>
        </Card>
      </div>
    </PremiumGate>
  );
}
