import { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  PLAN_PRICES,
  PAYG_BASE_PRICE_CENTS,
  PAYG_PRICES_CENTS,
  PAYG_DEFAULT_MODULES,
  TRIAL_DURATION_DAYS,
  calcPaygPriceCents,
  paygLimits,
  type PaygModules,
  type SubscriptionPlan,
} from '@mieterplus/shared';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const WEB_URL =
  (Constants.expoConfig?.extra?.webApiUrl as string | undefined) ??
  'https://mieterplus.abdullahu.de';

const fmt = (n: number) => n.toFixed(2).replace('.', ',');
const fmtCents = (cents: number) => fmt(cents / 100);

const PLUS_FEATURES = [
  'Bis 3 Immobilien · 30 Einheiten',
  'Terminplaner mit Push',
  '25 Tresor-Dokumente',
  'Statistiken',
];
const PRO_FEATURES = [
  'Bis 10 Immobilien · 100 Einheiten',
  'Übergabeprotokoll (PDF)',
  '100 Tresor-Dokumente',
  '1 Hausverwalter einladen',
  'Alles aus Plus',
];

/**
 * Mobile-Upgrade-Seite — komplettes Pendant zu /dashboard/upgrade auf Web.
 * Plus/Pro/PayG-Auswahl + PayG-Kalkulator. Checkout läuft via Web-URL
 * (Stripe-Hosted-Checkout im In-App-Browser).
 */
export default function UpgradeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [payg, setPayg] = useState<PaygModules>(PAYG_DEFAULT_MODULES);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const paygCents = useMemo(() => calcPaygPriceCents(payg), [payg]);
  const paygEff = useMemo(() => paygLimits(payg), [payg]);

  const currentPlan = (profile?.subscription_plan ?? 'trial') as SubscriptionPlan;
  const isTrial = currentPlan === 'trial';

  const checkout = async (plan: 'plus' | 'pro' | 'payg') => {
    setLoadingPlan(plan);
    try {
      // Wir holen die Stripe-URL über die existierende Web-API. Dafür braucht
      // der Aufruf einen gültigen Access-Token im Authorization-Header.
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        Alert.alert('Bitte erneut anmelden.');
        return;
      }
      const body =
        plan === 'payg'
          ? { plan, modules: payg }
          : { plan };
      const res = await fetch(`${WEB_URL}/api/landlord/subscription/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload?.url) {
        await Linking.openURL(payload.url);
        return;
      }
      Alert.alert(
        'Bezahlung nicht verfügbar',
        payload?.error?.message ?? 'Bitte später erneut versuchen.',
      );
    } catch {
      Alert.alert('Fehler', 'Etwas ist schiefgelaufen.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="p-4 gap-4 pb-10"
    >
      <View>
        <Pressable onPress={() => router.back()} className="mb-3 flex-row items-center gap-2">
          <Ionicons name="chevron-back" size={18} color="#2563eb" />
          <Text className="text-sm font-medium text-primary">Zurück</Text>
        </Pressable>
        <Text className="text-2xl font-bold text-foreground">Tarife</Text>
        <Text className="text-sm text-muted-foreground">
          Wähle, was zu dir passt — jederzeit kündbar.
        </Text>
      </View>

      {isTrial && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex-row items-start gap-3 p-4">
            <Ionicons name="sparkles-outline" size={20} color="#2563eb" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">
                {TRIAL_DURATION_DAYS}-Tage-Testversion
              </Text>
              <Text className="text-xs text-muted-foreground">
                Du nutzt aktuell den vollen Plus-Funktionsumfang gratis. Wähle vor Ablauf einen
                Tarif.
              </Text>
            </View>
          </CardContent>
        </Card>
      )}

      <PlanCard
        title="Plus"
        active={currentPlan === 'plus'}
        recommended
        priceLabel={`${fmt(PLAN_PRICES.plus.monthly)} € / Monat`}
        description="Das volle Werkzeug für den Vermieter-Alltag."
        features={PLUS_FEATURES}
        loading={loadingPlan === 'plus'}
        disabled={loadingPlan !== null}
        onChoose={() => checkout('plus')}
      />

      <PlanCard
        title="Pro"
        active={currentPlan === 'pro'}
        priceLabel={`${fmt(PLAN_PRICES.pro.monthly)} € / Monat`}
        description="Für Profis — inklusive Übergabeprotokoll & Verwalter."
        features={PRO_FEATURES}
        loading={loadingPlan === 'pro'}
        disabled={loadingPlan !== null}
        onChoose={() => checkout('pro')}
      />

      <Card
        className={
          currentPlan === 'payg'
            ? 'border-amber-400 bg-amber-50/40'
            : 'border-2 border-dashed border-amber-300 bg-amber-50/10'
        }
      >
        <CardHeader>
          <CardTitle className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Ionicons name="construct-outline" size={20} color="#b45309" />
              <Text className="text-base font-bold text-foreground">Pay-as-you-go</Text>
            </View>
            {currentPlan === 'payg' && <Badge variant="success">Aktiv</Badge>}
          </CardTitle>
          <CardDescription>
            Bausteine selbst zusammenstellen — du zahlst nur, was du nutzt.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <Text className="text-3xl font-black text-amber-700">
            {fmtCents(paygCents)} €
            <Text className="text-sm font-normal text-muted-foreground"> / Monat</Text>
          </Text>
          <Text className="text-[11px] text-muted-foreground">
            ab {fmtCents(PAYG_BASE_PRICE_CENTS)} € Grund-Abo (1 Immobilie · 10 Einheiten)
          </Text>

          <View className="rounded-md bg-amber-50 p-3 gap-1.5">
            <Stepper
              label="Zusätzliche Immobilien"
              hint={`+ ${fmtCents(PAYG_PRICES_CENTS.extraProperty)} € / Stück`}
              value={payg.extraProperties}
              onChange={(v) => setPayg({ ...payg, extraProperties: v })}
            />
            <Stepper
              label="10er-Pakete Einheiten"
              hint={`+ ${fmtCents(PAYG_PRICES_CENTS.unitsBundle)} € / Paket`}
              value={payg.unitsBundles}
              onChange={(v) => setPayg({ ...payg, unitsBundles: v })}
            />
            <Stepper
              label="Tresor-Pakete (25 Doks)"
              hint={`+ ${fmtCents(PAYG_PRICES_CENTS.vaultBundle)} € / Paket`}
              value={payg.vaultBundles}
              onChange={(v) => setPayg({ ...payg, vaultBundles: v })}
            />
            <Stepper
              label="Hausverwalter"
              hint={`+ ${fmtCents(PAYG_PRICES_CENTS.manager)} € / Stück`}
              value={payg.managers}
              onChange={(v) => setPayg({ ...payg, managers: v })}
            />
            <Toggle
              label="Übergabeprotokoll"
              hint={`+ ${fmtCents(PAYG_PRICES_CENTS.handover)} € · PDF-Übergabe`}
              value={payg.handover}
              onChange={(v) => setPayg({ ...payg, handover: v })}
            />
            <Toggle
              label="Terminplaner mit Push"
              hint={`+ ${fmtCents(PAYG_PRICES_CENTS.appointmentsPremium)} € · Slots & Reminder`}
              value={payg.appointmentsPremium}
              onChange={(v) => setPayg({ ...payg, appointmentsPremium: v })}
            />
          </View>

          <View className="rounded-md bg-muted/50 p-3">
            <Text className="text-xs font-medium text-foreground">Aktive Konfiguration:</Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">
              {paygEff.properties} Immobilien · {paygEff.units} Einheiten · {paygEff.vaultDocs} Doks
              {paygEff.handover ? ' · Übergabeprotokoll' : ''}
              {paygEff.appointments ? ' · Termine' : ''}
              {paygEff.managers ? ` · ${paygEff.managers} Verwalter` : ''}
            </Text>
          </View>

          <Button
            fullWidth
            className="bg-amber-600"
            loading={loadingPlan === 'payg'}
            onPress={() => checkout('payg')}
          >
            {fmtCents(paygCents)} € / Monat starten
          </Button>
        </CardContent>
      </Card>

      <Text className="text-center text-[11px] text-muted-foreground">
        Bezahlung über Stripe · Rechnung kommt per E-Mail · {Platform.OS === 'ios' ? 'iOS' : 'Android'}
      </Text>
    </ScrollView>
  );
}

function PlanCard({
  title,
  active,
  recommended,
  priceLabel,
  description,
  features,
  loading,
  disabled,
  onChoose,
}: {
  title: string;
  active: boolean;
  recommended?: boolean;
  priceLabel: string;
  description: string;
  features: string[];
  loading: boolean;
  disabled: boolean;
  onChoose: () => void;
}) {
  return (
    <Card className={active ? 'border-2 border-primary' : recommended ? 'border-2 border-primary/60' : ''}>
      <CardHeader className="gap-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-foreground">{title}</Text>
          {active ? (
            <Badge variant="success">Aktiv</Badge>
          ) : recommended ? (
            <Badge variant="info">Beliebt</Badge>
          ) : null}
        </View>
        <Text className="text-2xl font-black text-primary">{priceLabel}</Text>
        <Text className="text-xs text-muted-foreground">{description}</Text>
      </CardHeader>
      <CardContent className="gap-2">
        {features.map((f) => (
          <View key={f} className="flex-row items-start gap-2">
            <Ionicons name="checkmark-circle" size={16} color="#2563eb" />
            <Text className="flex-1 text-sm text-foreground">{f}</Text>
          </View>
        ))}
        {!active && (
          <Button
            fullWidth
            className="mt-2"
            loading={loading}
            disabled={disabled}
            onPress={onChoose}
          >
            {title} wählen
          </Button>
        )}
      </CardContent>
    </Card>
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
    <View className="flex-row items-center justify-between gap-3 rounded-md bg-white p-2.5">
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground">{label}</Text>
        <Text className="text-[11px] text-muted-foreground">{hint}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          className="h-8 w-8 items-center justify-center rounded-md border border-border bg-white"
        >
          <Text className="text-base">−</Text>
        </Pressable>
        <Text className="min-w-[24px] text-center font-mono text-base font-bold">{value}</Text>
        <Pressable
          onPress={() => onChange(value + 1)}
          className="h-8 w-8 items-center justify-center rounded-md border border-border bg-white"
        >
          <Text className="text-base">+</Text>
        </Pressable>
      </View>
    </View>
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
    <Pressable
      onPress={() => onChange(!value)}
      className={`flex-row items-center justify-between gap-3 rounded-md p-2.5 ${
        value ? 'bg-amber-100' : 'bg-white'
      }`}
    >
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground">{label}</Text>
        <Text className="text-[11px] text-muted-foreground">{hint}</Text>
      </View>
      <View className={`h-6 w-11 rounded-full p-0.5 ${value ? 'bg-amber-500' : 'bg-zinc-200'}`}>
        <View
          className={`h-5 w-5 rounded-full bg-white ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </View>
    </Pressable>
  );
}
