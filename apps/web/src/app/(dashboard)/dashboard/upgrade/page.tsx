import { redirect } from 'next/navigation';
import { Check, Sparkles } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSubscription } from '@/lib/subscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UpgradeButton } from './upgrade-button';

export const metadata = { title: 'Upgrade auf Premium' };

const BASIC_FEATURES = [
  'Immobilien & Wohnungen verwalten',
  'Mängelmeldungen empfangen & bearbeiten',
  'Mieter per Einladungscode verknüpfen',
  'Bis zu 5 Dokumente im Tresor',
];

const PREMIUM_FEATURES = [
  'Alles aus Basic',
  'Digitales Übergabeprotokoll mit Unterschrift & PDF',
  'Dokumenten-Tresor: bis zu 200 Dokumente + Lesebestätigung',
  'Interaktiver Terminplaner mit E-Mail & Push',
  'Bevorzugter Support',
];

export default async function UpgradePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const sub = await getSubscription(supabase, user.id);

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-up">
      <div className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-3xl font-black tracking-tight">
          <Sparkles className="h-7 w-7 text-[#2563a8]" />
          Mieter <span className="plus-pulse" aria-hidden>+</span> Premium
        </h1>
        <p className="mt-2 text-muted-foreground">
          Profi-Werkzeuge für Vermieter — Übergabeprotokoll, Dokumenten-Tresor und Terminplaner.
        </p>
        {sub.isPremium && (
          <Badge variant="success" className="mt-3">
            Du hast bereits Premium
            {sub.validUntil
              ? ` · gültig bis ${new Date(sub.validUntil).toLocaleDateString('de-DE')}`
              : ''}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic */}
        <Card className={sub.plan === 'basic' ? 'border-2 border-zinc-300' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Basic
              {sub.plan === 'basic' && <Badge variant="secondary">Aktueller Plan</Badge>}
            </CardTitle>
            <CardDescription>Für den Einstieg — kostenlos.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-3xl font-black">
              0&nbsp;€<span className="text-sm font-normal text-muted-foreground"> / Monat</span>
            </p>
            <ul className="space-y-2 text-sm">
              {BASIC_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Premium */}
        <Card className="relative border-2 border-[#2563a8]">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-[#2563a8] text-white">Empfohlen</Badge>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Premium
              {sub.isPremium && <Badge variant="success">Aktiv</Badge>}
            </CardTitle>
            <CardDescription>Für professionelle Vermieter.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-3xl font-black">
              19&nbsp;€
              <span className="text-sm font-normal text-muted-foreground"> / Monat</span>
            </p>
            <ul className="mb-6 space-y-2 text-sm">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2563a8]" />
                  {f}
                </li>
              ))}
            </ul>
            {!sub.isPremium && <UpgradeButton />}
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Die Online-Bezahlung wird in Kürze freigeschaltet. Bis dahin kann dein Premium-Zugang
        manuell durch unser Team aktiviert werden — wende dich einfach an den Support.
      </p>
    </div>
  );
}
