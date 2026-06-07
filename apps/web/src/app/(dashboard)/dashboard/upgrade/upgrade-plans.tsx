'use client';

import { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { PLAN_PRICES, type SubscriptionPlan } from '@mieterplus/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/loading';

const FEATURES: Record<SubscriptionPlan, string[]> = {
  free: [
    '1 Immobilie · bis 3 Wohneinheiten',
    'Mängelmanagement mit Foto',
    'Mieter per Code einladen',
    '3 Dokumente im Tresor',
  ],
  plus: [
    'Bis 10 Immobilien · 30 Einheiten',
    'Digitales Übergabeprotokoll (PDF)',
    'Terminplaner mit Benachrichtigung',
    'Dokumenten-Tresor: 50 Dokumente',
    '1 Hausverwaltung einladen',
    'Statistiken',
  ],
  pro: [
    'Unbegrenzt Immobilien & Einheiten',
    'Dokumenten-Tresor: unbegrenzt',
    'Mehrere Hausverwaltungen',
    'Alle Plus-Funktionen',
    'Prioritäts-Support',
  ],
};

export function UpgradePlans({ currentPlan }: { currentPlan: SubscriptionPlan }) {
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const checkout = async (plan: 'plus' | 'pro') => {
    setLoadingPlan(plan);
    setInfo(null);
    try {
      const res = await fetch('/api/landlord/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.url) {
        window.location.href = payload.url;
        return;
      }
      setInfo(payload?.error?.message ?? 'Die Online-Bezahlung ist noch nicht verfügbar.');
    } catch {
      setInfo('Etwas ist schiefgelaufen. Bitte später erneut versuchen.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const priceFor = (plan: 'plus' | 'pro') =>
    interval === 'month'
      ? `${PLAN_PRICES[plan].monthly.toFixed(2).replace('.', ',')} €`
      : `${PLAN_PRICES[plan].yearly} €`;
  const suffix = interval === 'month' ? '/ Monat' : '/ Jahr';

  return (
    <div className="space-y-6">
      {/* Intervall-Umschalter */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setInterval('month')}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            interval === 'month' ? 'bg-brand text-white' : 'bg-zinc-100 text-zinc-600'
          }`}
        >
          Monatlich
        </button>
        <button
          onClick={() => setInterval('year')}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            interval === 'year' ? 'bg-brand text-white' : 'bg-zinc-100 text-zinc-600'
          }`}
        >
          Jährlich
          <span className="ml-1 text-[10px] text-emerald-300">2 Monate gratis</span>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Free */}
        <Card className={currentPlan === 'free' ? 'border-2 border-zinc-300' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Free
              {currentPlan === 'free' && <Badge variant="secondary">Aktiv</Badge>}
            </CardTitle>
            <CardDescription>
              Kostenlos starten — ideal für eine einzelne Wohnung.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-3xl font-black">
              0 €<span className="text-sm font-normal text-muted-foreground"> / Monat</span>
            </p>
            <ul className="space-y-2 text-sm">
              {FEATURES.free.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" /> {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Plus */}
        <Card className="relative border-2 border-[#2563a8]">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-[#2563a8] text-white">Beliebt</Badge>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Plus
              {currentPlan === 'plus' && <Badge variant="success">Aktiv</Badge>}
            </CardTitle>
            <CardDescription>
              Das volle Werkzeug für den Vermieter-Alltag.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-3xl font-black">
              {priceFor('plus')}
              <span className="text-sm font-normal text-muted-foreground"> {suffix}</span>
            </p>
            <ul className="mb-6 space-y-2 text-sm">
              {FEATURES.plus.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2563a8]" /> {f}
                </li>
              ))}
            </ul>
            {currentPlan !== 'plus' && (
              <Button className="w-full" disabled={loadingPlan !== null} onClick={() => checkout('plus')}>
                {loadingPlan === 'plus' ? <Spinner /> : <Sparkles className="h-4 w-4" />}
                Plus wählen
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Pro */}
        <Card className={currentPlan === 'pro' ? 'border-2 border-[#2563a8]' : 'border-2 border-zinc-200'}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Pro
              {currentPlan === 'pro' && <Badge variant="success">Aktiv</Badge>}
            </CardTitle>
            <CardDescription>
              Unbegrenzt verwalten — für Profis &amp; Teams.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-3xl font-black">
              {priceFor('pro')}
              <span className="text-sm font-normal text-muted-foreground"> {suffix}</span>
            </p>
            <ul className="mb-6 space-y-2 text-sm">
              {FEATURES.pro.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2563a8]" /> {f}
                </li>
              ))}
            </ul>
            {currentPlan !== 'pro' && (
              <Button className="w-full" disabled={loadingPlan !== null} onClick={() => checkout('pro')}>
                {loadingPlan === 'pro' ? <Spinner /> : <Sparkles className="h-4 w-4" />}
                Pro wählen
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {info && (
        <p className="rounded-md bg-[#eff6ff] p-3 text-center text-sm text-[#2563a8]">{info}</p>
      )}
    </div>
  );
}
