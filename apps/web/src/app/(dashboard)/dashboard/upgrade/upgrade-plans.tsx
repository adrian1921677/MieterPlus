'use client';

import { useMemo, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import {
  PLAN_PRICES,
  PAYG_PRICES_CENTS,
  PAYG_BASE_PRICE_CENTS,
  PAYG_DEFAULT_MODULES,
  calcPaygPriceCents,
  paygLimits,
  TRIAL_DURATION_DAYS,
  type PaygModules,
  type SubscriptionPlan,
} from '@mieterplus/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/loading';

const FEATURES: Record<'plus' | 'pro', string[]> = {
  plus: [
    'Bis 3 Immobilien · 30 Einheiten',
    'Terminplaner mit Benachrichtigung',
    'Dokumenten-Tresor: 25 Dokumente',
    'Statistiken',
  ],
  pro: [
    'Bis 10 Immobilien · 100 Einheiten',
    'Digitales Übergabeprotokoll (PDF)',
    'Alles aus Plus',
    'Dokumenten-Tresor: 100 Dokumente',
    '1 Hausverwaltung einladen',
  ],
};

const fmt = (n: number) => n.toFixed(2).replace('.', ',');
const fmtCents = (cents: number) => fmt(cents / 100);

export function UpgradePlans({ currentPlan }: { currentPlan: SubscriptionPlan }) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [payg, setPayg] = useState<PaygModules>(PAYG_DEFAULT_MODULES);

  const paygPriceCents = useMemo(() => calcPaygPriceCents(payg), [payg]);
  const paygEffectiveLimits = useMemo(() => paygLimits(payg), [payg]);

  const checkout = async (plan: 'plus' | 'pro' | 'payg') => {
    setLoadingPlan(plan);
    setInfo(null);
    try {
      const body =
        plan === 'payg'
          ? { plan, modules: payg, price_cents: paygPriceCents }
          : { plan, interval: 'month' };
      const res = await fetch('/api/landlord/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  return (
    <div className="space-y-8">
      {/* Trial-Hinweis */}
      {currentPlan === 'trial' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Du bist gerade in deiner <strong>{TRIAL_DURATION_DAYS}-Tage-Testversion</strong> —
              voller Plus-Funktionsumfang ohne Kosten. Wähle vor Ablauf einen Tarif, damit kein
              Funktionsverlust entsteht.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
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
            <CardDescription>Das volle Werkzeug für den Vermieter-Alltag.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-3xl font-black">
                {fmt(PLAN_PRICES.plus.monthly)} €
                <span className="text-sm font-normal text-muted-foreground"> / Monat</span>
              </p>
              <p className="text-xs text-muted-foreground">monatlich · jederzeit kündbar</p>
            </div>
            <ul className="mb-6 space-y-2 text-sm">
              {FEATURES.plus.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2563a8]" /> {f}
                </li>
              ))}
            </ul>
            {currentPlan !== 'plus' && (
              <Button
                className="w-full"
                disabled={loadingPlan !== null}
                onClick={() => checkout('plus')}
              >
                {loadingPlan === 'plus' ? <Spinner /> : <Sparkles className="h-4 w-4" />}
                Plus wählen
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Pro */}
        <Card
          className={
            currentPlan === 'pro' ? 'border-2 border-[#2563a8]' : 'border-2 border-zinc-200'
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Pro
              {currentPlan === 'pro' && <Badge variant="success">Aktiv</Badge>}
            </CardTitle>
            <CardDescription>Für Profis — inklusive Übergabeprotokoll &amp; Verwalter.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-3xl font-black">
                {fmt(PLAN_PRICES.pro.monthly)} €
                <span className="text-sm font-normal text-muted-foreground"> / Monat</span>
              </p>
              <p className="text-xs text-muted-foreground">monatlich · jederzeit kündbar</p>
            </div>
            <ul className="mb-6 space-y-2 text-sm">
              {FEATURES.pro.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2563a8]" /> {f}
                </li>
              ))}
            </ul>
            {currentPlan !== 'pro' && (
              <Button
                className="w-full"
                disabled={loadingPlan !== null}
                onClick={() => checkout('pro')}
              >
                {loadingPlan === 'pro' ? <Spinner /> : <Sparkles className="h-4 w-4" />}
                Pro wählen
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Pay-as-you-go-Karte (kompakte Vorschau, Kalkulator unten) */}
        <Card
          className={
            currentPlan === 'payg'
              ? 'border-2 border-amber-400 bg-amber-50/30'
              : 'border-2 border-dashed border-amber-300'
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Pay-as-you-go
              {currentPlan === 'payg' && <Badge variant="success">Aktiv</Badge>}
            </CardTitle>
            <CardDescription>
              Zahle nur, was du wirklich nutzt — Bausteine selbst zusammenstellen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-black text-amber-700">
              {fmtCents(paygPriceCents)} €
              <span className="text-sm font-normal text-muted-foreground"> / Monat</span>
            </p>
            <p className="text-xs text-muted-foreground">
              ab {fmtCents(PAYG_BASE_PRICE_CENTS)} € Grund-Abo (1 Immobilie · 10 Einheiten)
            </p>
            <div className="rounded-md bg-muted/40 p-3 text-xs">
              <p className="font-medium">Mit deiner aktuellen Konfiguration:</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                <li>• {paygEffectiveLimits.properties} Immobilie(n)</li>
                <li>• {paygEffectiveLimits.units} Einheiten</li>
                <li>• {paygEffectiveLimits.vaultDocs} Tresor-Dokumente</li>
                {paygEffectiveLimits.handover && <li>• Übergabeprotokoll</li>}
                {paygEffectiveLimits.appointments && <li>• Terminplaner mit Push</li>}
                {paygEffectiveLimits.managers ? (
                  <li>• {paygEffectiveLimits.managers} Hausverwalter</li>
                ) : null}
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">Bausteine unten anpassen →</p>
          </CardContent>
        </Card>
      </div>

      {/* Pay-as-you-go-Kalkulator */}
      <Card className="border-amber-300 bg-amber-50/40">
        <CardHeader>
          <CardTitle className="text-base">Pay-as-you-go Kalkulator</CardTitle>
          <CardDescription>
            Setze nur, was du brauchst. Preis aktualisiert sich live.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Stepper
              label="Zusätzliche Immobilien"
              hint={`+ ${fmtCents(PAYG_PRICES_CENTS.extraProperty)} € pro Stück`}
              value={payg.extraProperties}
              onChange={(v) => setPayg({ ...payg, extraProperties: Math.max(0, v) })}
            />
            <Stepper
              label="Zusätzliche 10er-Pakete Einheiten"
              hint={`+ ${fmtCents(PAYG_PRICES_CENTS.unitsBundle)} € pro Paket`}
              value={payg.unitsBundles}
              onChange={(v) => setPayg({ ...payg, unitsBundles: Math.max(0, v) })}
            />
            <Stepper
              label="Tresor-Pakete à 25 Dokumente"
              hint={`+ ${fmtCents(PAYG_PRICES_CENTS.vaultBundle)} € pro Paket`}
              value={payg.vaultBundles}
              onChange={(v) => setPayg({ ...payg, vaultBundles: Math.max(0, v) })}
            />
            <Stepper
              label="Hausverwalter"
              hint={`+ ${fmtCents(PAYG_PRICES_CENTS.manager)} € pro Verwalter`}
              value={payg.managers}
              onChange={(v) => setPayg({ ...payg, managers: Math.max(0, v) })}
            />
            <Toggle
              label="Übergabeprotokoll-Modul"
              hint={`+ ${fmtCents(PAYG_PRICES_CENTS.handover)} € · digitale PDF-Übergabe`}
              value={payg.handover}
              onChange={(v) => setPayg({ ...payg, handover: v })}
            />
            <Toggle
              label="Terminplaner mit Push"
              hint={`+ ${fmtCents(PAYG_PRICES_CENTS.appointmentsPremium)} € · Slots & Reminder`}
              value={payg.appointmentsPremium}
              onChange={(v) => setPayg({ ...payg, appointmentsPremium: v })}
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-amber-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-2xl font-black text-amber-700">
              {fmtCents(paygPriceCents)} € / Monat
            </p>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              disabled={loadingPlan !== null}
              onClick={() => checkout('payg')}
            >
              {loadingPlan === 'payg' ? <Spinner /> : <Sparkles className="h-4 w-4" />}
              Pay-as-you-go starten
            </Button>
          </div>
        </CardContent>
      </Card>

      {info && (
        <p className="rounded-md bg-[#eff6ff] p-3 text-center text-sm text-[#2563a8]">{info}</p>
      )}
    </div>
  );
}

function Stepper({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-md border border-amber-200 bg-white p-3">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={() => onChange(value - 1)}
          disabled={value <= 0}
          className="h-8 w-8 rounded-md border border-zinc-200 text-lg disabled:opacity-40"
        >
          −
        </button>
        <span className="min-w-[2ch] text-center font-mono text-lg font-bold">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="h-8 w-8 rounded-md border border-zinc-200 text-lg"
        >
          +
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`rounded-md border p-3 text-left transition ${
        value
          ? 'border-amber-500 bg-amber-100/50 ring-2 ring-amber-300'
          : 'border-amber-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <div
          className={`h-5 w-9 rounded-full p-0.5 transition ${
            value ? 'bg-amber-500' : 'bg-zinc-200'
          }`}
        >
          <div
            className={`h-4 w-4 rounded-full bg-white transition ${
              value ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </button>
  );
}
