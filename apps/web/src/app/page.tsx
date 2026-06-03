import Link from 'next/link';

const features = [
  {
    number: '01',
    eyebrow: 'Für Mieter',
    title: 'Mängel in 30 Sekunden gemeldet.',
    description:
      'Foto schießen, Kategorie wählen, abschicken. Sie sehen jederzeit den Status Ihrer Anfragen und chatten direkt mit Ihrem Vermieter — ohne Anrufe, ohne Wartezeit, ohne Papierkram.',
  },
  {
    number: '02',
    eyebrow: 'Für Vermieter',
    title: 'Alle Mängel an einem Ort.',
    description:
      'Behalten Sie den Überblick über all Ihre Immobilien — priorisieren, delegieren, dokumentieren. Mit revisionssicherem Audit-Log und klarer Verantwortlichkeit pro Objekt.',
  },
  {
    number: '03',
    eyebrow: 'Sicher & konform',
    title: 'EU-Hosting, DSGVO, Row-Level-Security.',
    description:
      'Daten werden in Frankfurt gehostet. Verifikation per Eigentumsnachweis und Mieter-Code stellt sicher, dass nur Berechtigte Zugriff erhalten — Ende-zu-Ende.',
  },
];

const steps = [
  {
    step: 'Schritt 1',
    title: 'Registrieren',
    text: 'Als Mieter über die App, als Vermieter über das Web-Dashboard — in wenigen Minuten.',
  },
  {
    step: 'Schritt 2',
    title: 'Verifizieren',
    text: 'Vermieter laden ihren Eigentumsnachweis hoch, Mieter erhalten einen 12-stelligen Einladungscode.',
  },
  {
    step: 'Schritt 3',
    title: 'Loslegen',
    text: 'Mängel melden, Status verfolgen, Aufträge verwalten — transparent und nachvollziehbar.',
  },
];

const proof = [
  { value: '30s', label: 'Mangel gemeldet' },
  { value: 'EU', label: 'Hosting in Frankfurt' },
  { value: '24/7', label: 'Verfügbarkeit' },
];

const tickerItems = [
  'Mängelmeldung', '·', 'DSGVO-konform', '·', 'EU-Hosting', '·',
  'Foto-Upload', '·', 'Live-Status', '·', 'Audit-Log', '·',
  'Verifiziert', '·', 'Mobil & Web', '·',
];

export default function HomePage() {
  return (
    <main className="bg-surface text-brand">
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-5 py-4 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="group flex items-center gap-3"
            aria-label="Mieter + Startseite"
          >
            <span className="leading-tight">
              <span className="block text-[15px] font-black tracking-tight text-brand transition-[letter-spacing] duration-300 group-hover:tracking-wide">
                ADB · Mieter <span aria-hidden className="plus-pulse">+</span>
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Digitale Mängelmeldung
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-3" aria-label="Hauptnavigation">
            <a
              href="https://abdullahu.de"
              className="hidden text-[12px] font-semibold uppercase tracking-[0.15em] text-zinc-400 transition-colors hover:text-brand md:inline"
              title="Zurück zur ADB-Hauptseite"
            >
              ← ADB Hauptseite
            </a>
            <Link
              href="/login"
              className="hidden text-[12px] font-semibold uppercase tracking-[0.15em] text-zinc-400 transition-colors hover:text-brand sm:inline"
            >
              Anmelden
            </Link>
            <Link
              href="/signup"
              className="cta-arrow inline-flex items-center gap-2 rounded-sm bg-brand px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-white transition-all hover:bg-brand-light"
            >
              Konto erstellen
              <span aria-hidden>→</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section aria-labelledby="hero-heading" className="relative overflow-hidden bg-white">
        <div
          className="pointer-events-none absolute inset-y-0 left-[calc(50%+200px)] hidden w-px bg-zinc-100 lg:block"
          aria-hidden
        />

        <div className="mx-auto max-w-7xl px-5 pb-24 pt-20 sm:px-8 sm:pb-32 sm:pt-28 lg:px-10 lg:pt-36">
          <p className="mb-8 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-400 animate-fade-up">
            <span className="inline-block h-px w-8 bg-[#2563a8]" aria-hidden />
            Eine App von ADB · Wuppertal
          </p>

          <h1
            id="hero-heading"
            className="text-display-xl font-black text-brand animate-fade-up"
            style={{ fontFeatureSettings: '"ss01"', animationDelay: '60ms' }}
          >
            Mieter{' '}
            <span aria-hidden className="plus-pulse inline-block">+</span>
            <span className="sr-only">Plus</span>
            <br />
            <span className="text-zinc-300">Mängel. Gelöst.</span>
          </h1>

          <div className="mt-12 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <p className="max-w-md text-base leading-relaxed text-zinc-500 animate-fade-up" style={{ animationDelay: '120ms' }}>
              Die digitale Plattform, die Mieter und Vermieter verbindet —
              sicher, DSGVO-konform und ohne Papierkram. Eine Lösung von
              ADB Dienstleistungen.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row animate-fade-up" style={{ animationDelay: '180ms' }}>
              <Link
                href="/signup?role=tenant"
                className="cta-arrow group inline-flex items-center gap-3 rounded-sm bg-brand px-7 py-4 text-sm font-bold uppercase tracking-[0.15em] text-white transition-all hover:bg-brand-light"
              >
                Als Mieter starten
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/signup?role=landlord"
                className="cta-arrow group inline-flex items-center gap-3 rounded-sm border border-zinc-200 bg-white px-7 py-4 text-sm font-bold uppercase tracking-[0.15em] text-brand transition-all hover:border-brand"
              >
                Als Vermieter starten
                <span aria-hidden className="text-[#2563a8] transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-zinc-100" aria-hidden />
      </section>

      {/* ── TICKER ─────────────────────────────────────────────── */}
      <div className="overflow-hidden border-b border-zinc-100 bg-surface py-3" aria-label="Plattform-Features">
        <div className="marquee-track">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span
              key={i}
              className={`whitespace-nowrap px-5 text-[11px] font-semibold uppercase tracking-[0.25em] ${
                item === '·' ? 'text-[#2563a8]' : 'text-zinc-400'
              }`}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section aria-labelledby="features-heading" className="bg-surface">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <h2 id="features-heading" className="sr-only">Funktionen</h2>
          {features.map((feature, i) => (
            <div
              key={feature.number}
              className={`service-row group grid cursor-default gap-8 border-b border-zinc-100 py-12 lg:grid-cols-12 ${
                i === 0 ? 'border-t' : ''
              }`}
            >
              <div className="lg:col-span-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-300">
                  {feature.number}
                </span>
              </div>

              <div className="lg:col-span-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#2563a8]">
                  {feature.eyebrow}
                </p>
                <h3 className="text-display-md font-black text-brand">{feature.title}</h3>
              </div>

              <div className="lg:col-span-5">
                <p className="text-sm leading-relaxed text-zinc-500">{feature.description}</p>
              </div>

              <div className="flex items-start lg:col-span-2 lg:justify-end">
                <Link
                  href="/signup"
                  className="link-underline inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.15em] text-brand transition-colors group-hover:text-[#2563a8]"
                >
                  Loslegen
                  <span aria-hidden className="text-[#2563a8] transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section aria-labelledby="how-heading" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#2563a8]">
            So funktioniert&apos;s
          </p>
          <h2 id="how-heading" className="mb-12 text-display-md font-black tracking-tight text-brand">
            In drei Schritten zur digitalen Hausverwaltung.
          </h2>

          <div className="grid gap-0 divide-y divide-zinc-100 border border-zinc-100 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {steps.map((s) => (
              <div key={s.step} className="group p-10 transition-colors hover:bg-surface">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#2563a8]">
                  {s.step}
                </p>
                <h3 className="text-display-md font-black text-brand">{s.title}</h3>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-500">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROOF ─────────────────────────────────────────────── */}
      <section aria-label="Kennzahlen" className="bg-brand py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-0 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {proof.map((item) => (
              <div key={item.label} className="py-10 sm:px-10 sm:py-0 first:pt-0 last:pb-0 sm:first:pl-0 sm:last:pr-0">
                <p className="text-[clamp(3rem,6vw,4.5rem)] font-black leading-none tracking-tight text-white">
                  {item.value}
                </p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST ─────────────────────────────────────────────── */}
      <section aria-labelledby="trust-heading" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <h2 id="trust-heading" className="mb-6 text-2xl font-black tracking-tight text-brand sm:text-3xl">
            Sicher, weil Vertrauen zählt.
          </h2>
          <div className="grid max-w-5xl gap-8 text-sm leading-relaxed text-zinc-500 sm:text-base lg:grid-cols-2">
            <p>
              Mieter <span className="plus-pulse font-black" aria-hidden>+</span>
              <span className="sr-only">Plus</span> wurde von Grund auf
              datenschutzkonform entwickelt. Alle personenbezogenen Daten
              werden ausschließlich auf europäischen Servern in Frankfurt
              gehostet. Mit Row-Level-Security stellen wir technisch sicher,
              dass jeder Nutzer nur die Daten sieht, für die er auch
              berechtigt ist.
            </p>
            <p>
              Vermieter weisen ihr Eigentum per offiziellem Dokument
              (Grundbuchauszug, Notarurkunde oder Kaufvertrag) nach. Mieter
              bestätigen ihre Mietverhältnisse über einen 12-stelligen
              Einladungscode. So entsteht eine verifizierte, vertrauenswürdige
              Plattform — ohne Schatten-Accounts oder Missbrauch.
            </p>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────── */}
      <section aria-label="Bereit?" className="bg-brand">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
                Mieter <span className="plus-pulse" aria-hidden>+</span>
                <span className="sr-only">Plus</span> · Jetzt starten
              </p>
              <h2 className="text-display-md font-black text-white">
                Bereit für die digitale Mängelmeldung?
              </h2>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="cta-arrow inline-flex items-center gap-2 rounded-sm bg-white px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.15em] text-brand transition-all hover:bg-zinc-100"
              >
                Konto erstellen <span aria-hidden>→</span>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-white/20 px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.15em] text-white/80 transition-all hover:border-white/50 hover:text-white"
              >
                Anmelden
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-100 bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 sm:px-8 sm:flex-row lg:px-10">
          <p>© {new Date().getFullYear()} ADB Dienstleistungen · Mieter +</p>
          <div className="flex gap-6">
            <a href="https://abdullahu.de" className="hover:text-brand transition-colors">
              ADB Hauptseite
            </a>
            <Link href="/datenschutz" className="hover:text-brand transition-colors">
              Datenschutz
            </Link>
            <Link href="/impressum" className="hover:text-brand transition-colors">
              Impressum
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
