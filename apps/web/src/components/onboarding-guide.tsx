'use client';

import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import 'driver.js/dist/driver.css';

type Role = 'tenant' | 'landlord' | 'admin';
type RawStep = { el?: string; title: string; description: string };

const STORAGE_KEY = 'mp_onboarding_v1';

// Tour-Schritte je Rolle. el = CSS-Selektor (data-tour). Ohne el = zentriert.
const STEPS: Record<Role, RawStep[]> = {
  tenant: [
    { title: '👋 Willkommen bei Mieter +!', description: 'Ich bin Albo und zeige dir in 1 Minute, wie alles funktioniert. Los geht’s!' },
    { el: '[data-tour="/dashboard"]', title: 'Deine Übersicht', description: 'Dein Startpunkt: Wohnungen, offene Mängel und Hinweise auf einen Blick.' },
    { el: '[data-tour="/dashboard/my-requests/new"]', title: 'Mangel melden', description: 'Etwas kaputt? Hier meldest du es in Sekunden – mit Foto direkt aus der App.' },
    { el: '[data-tour="/dashboard/my-requests"]', title: 'Meine Mängel', description: 'Verfolge den Status jeder Meldung live: offen, in Bearbeitung, behoben.' },
    { el: '[data-tour="/dashboard/my-documents"]', title: 'Meine Dokumente', description: 'Mietvertrag, Hausordnung & Co., die dein Vermieter mit dir teilt.' },
    { el: '[data-tour="/dashboard/my-appointments"]', title: 'Termine', description: 'Termine mit deinem Vermieter ansehen und buchen.' },
    { el: '[data-tour="/dashboard/support"]', title: 'Hilfe & Support', description: 'Fragen? Schreib uns direkt im Chat – wir helfen dir weiter.' },
    { el: '[data-tour="/dashboard/profile"]', title: 'Dein Profil', description: 'Hier pflegst du deine Daten. Fertig – viel Erfolg! 🎉' },
  ],
  landlord: [
    { title: '👋 Willkommen bei Mieter +!', description: 'Ich bin Albo und zeige dir kurz die wichtigsten Funktionen. Dauert nur 1 Minute.' },
    { el: '[data-tour="/dashboard"]', title: 'Deine Übersicht', description: 'Kennzahlen, offene Mängel und nächste Schritte gebündelt.' },
    { el: '[data-tour="/dashboard/properties"]', title: 'Immobilien', description: 'Lege hier deine Immobilien & Wohnungen an und lade Mieter per Code ein.' },
    { el: '[data-tour="/dashboard/requests"]', title: 'Mängel', description: 'Alle Mängelmeldungen deiner Mieter – bearbeiten, kommentieren, abschließen.' },
    { el: '[data-tour="/dashboard/handover"]', title: 'Übergabeprotokoll', description: 'Digitale Wohnungsübergabe mit Fotos, Zählerständen und Unterschrift als PDF.' },
    { el: '[data-tour="/dashboard/vault"]', title: 'Dokumenten-Tresor', description: 'Teile Dokumente sicher mit deinen Mietern – inkl. Lesebestätigung.' },
    { el: '[data-tour="/dashboard/appointments"]', title: 'Terminplaner', description: 'Termine anbieten, Mieter buchen lassen, automatische Benachrichtigungen.' },
    { el: '[data-tour="/dashboard/support"]', title: 'Hilfe & Support', description: 'Direkter Draht zu uns – schreib uns jederzeit im Chat.' },
    { el: '[data-tour="upgrade"]', title: 'Tarife', description: 'Mehr Immobilien & Premium-Funktionen mit Plus oder Pro. Fertig – viel Erfolg! 🎉' },
  ],
  admin: [
    { title: '👋 Hi Admin!', description: 'Kurzer Rundgang durch deine Verwaltungs-Bereiche.' },
    { el: '[data-tour="/dashboard/admin/support"]', title: 'Support-Postfach', description: 'Hier beantwortest du Nachrichten deiner Nutzer in Echtzeit.' },
    { el: '[data-tour="/dashboard/admin/users"]', title: 'Alle User', description: 'Nutzer verwalten und Premium freischalten.' },
    { el: '[data-tour="/dashboard/admin/verifications"]', title: 'Prüfungen', description: 'Immobilien- und Identitätsnachweise prüfen. Fertig! 🎉' },
  ],
};

export function OnboardingGuide({ role, userName }: { role: Role; userName?: string }) {
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Beim ersten Besuch die Sprechblase automatisch zeigen
    const seen = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const t = setTimeout(() => setBubbleOpen(true), 900);
      return () => clearTimeout(t);
    }
  }, []);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'done');
    } catch {
      /* ignore */
    }
  }, []);

  const startTour = useCallback(async () => {
    setBubbleOpen(false);
    markSeen();
    const { driver } = await import('driver.js');

    const raw = STEPS[role] ?? STEPS.tenant;
    const steps = raw
      .filter((s) => {
        if (!s.el) return true;
        const node = document.querySelector(s.el);
        return !!node && node.getClientRects().length > 0;
      })
      .map((s) => ({
        element: s.el,
        popover: { title: s.title, description: s.description },
      }));

    const d = driver({
      showProgress: true,
      allowClose: true,
      overlayColor: '#09090b',
      stagePadding: 6,
      stageRadius: 8,
      popoverClass: 'mp-tour',
      nextBtnText: 'Weiter',
      prevBtnText: 'Zurück',
      doneBtnText: 'Fertig 🎉',
      progressText: '{{current}} / {{total}}',
      steps,
    });
    d.drive();
  }, [role, markSeen]);

  const dismiss = useCallback(() => {
    setBubbleOpen(false);
    markSeen();
  }, [markSeen]);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 print:hidden">
      {/* Sprechblase */}
      {bubbleOpen && (
        <div className="animate-fade-up w-72 rounded-2xl rounded-br-sm border border-zinc-200 bg-white p-4 shadow-card-hover">
          <button
            onClick={dismiss}
            aria-label="Schließen"
            className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="pr-4 text-sm font-semibold text-foreground">
            Hi{userName ? ` ${userName.split(' ')[0]}` : ''}, ich bin Albo! 👋
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Soll ich dir Mieter + kurz zeigen? Dauert nur eine Minute.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={startTour}
              className="flex-1 rounded-lg bg-accent-adb px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-adb-hover"
            >
              Ja, zeig mir alles
            </button>
            <button
              onClick={dismiss}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              Später
            </button>
          </div>
        </div>
      )}

      {/* Maskottchen-Button */}
      <button
        onClick={() => setBubbleOpen((o) => !o)}
        aria-label="Hilfe-Assistent öffnen"
        className="group relative h-16 w-16 rounded-full bg-gradient-to-br from-accent-adb to-[#0ea5e9] shadow-card-hover transition-transform hover:scale-105 active:scale-95"
      >
        <span className="onboarding-bob block h-full w-full">
          <svg viewBox="0 0 64 64" className="h-full w-full p-2" aria-hidden>
            <circle cx="32" cy="33" r="26" fill="#ffffff" opacity="0.15" />
            <circle cx="24" cy="30" r="5.5" fill="#ffffff" />
            <circle cx="40" cy="30" r="5.5" fill="#ffffff" />
            <circle cx="25.2" cy="31" r="2.5" fill="#0b1f3a" />
            <circle cx="41.2" cy="31" r="2.5" fill="#0b1f3a" />
            <path d="M23 41 Q32 49 41 41" stroke="#ffffff" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          </svg>
        </span>
        {/* winkende Hand */}
        <span className="onboarding-wave absolute -right-1 -top-1 text-2xl">👋</span>
        {/* Markenzeichen + */}
        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[11px] font-black text-white/90">
          Mieter +
        </span>
      </button>
    </div>
  );
}
