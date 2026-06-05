import Link from 'next/link';
import { MieterPlusBrand } from '@/components/brand';

export const metadata = { title: 'Datenschutzerklärung' };

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-surface text-brand">
      <header className="border-b border-zinc-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/" aria-label="Mieter + Startseite">
            <MieterPlusBrand size={48} layout="horizontal" showSubtitle={false} />
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl space-y-8 px-5 py-12 text-sm leading-relaxed sm:px-8 lg:px-10">
        <div>
          <h1 className="text-display-md font-black">Datenschutzerklärung</h1>
          <p className="mt-2 text-muted-foreground">Stand: Juni 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-bold">1. Verantwortlicher</h2>
          <p>
            Verantwortlich für die Datenverarbeitung auf dieser Plattform ist ADB Dienstleistungen,
            Adrian Abdullahu, 42103 Wuppertal. Kontakt: info@abdullahu.de
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">2. Welche Daten wir verarbeiten</h2>
          <p>Bei der Nutzung von Mieter +:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>Account-Daten:</strong> Name, E-Mail-Adresse, Rolle (Mieter/Vermieter), bei
              Google-Login zusätzlich Google-Profilname.
            </li>
            <li>
              <strong>Eigentumsnachweise (Vermieter):</strong> Grundbuchauszüge, Kaufverträge,
              Notarurkunden — verschlüsselt gespeichert, nur Admins haben Zugriff.
            </li>
            <li>
              <strong>Identitätsdokumente (Vermieter, optional):</strong> Personalausweis-Bilder
              zur Verifikation.
            </li>
            <li>
              <strong>Mängelmeldungen (Mieter):</strong> Titel, Beschreibung, Kategorie,
              Fotos/Anhänge, Status-Verlauf.
            </li>
            <li>
              <strong>Adressdaten:</strong> Adressen der Immobilien, Wohnungsbezeichnungen.
            </li>
            <li>
              <strong>Technische Daten:</strong> IP-Adresse (gehashed für Rate-Limiting), Login-
              Zeitstempel.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">3. Wo Ihre Daten gespeichert werden</h2>
          <p>
            Alle personenbezogenen Daten werden ausschließlich auf europäischen Servern in
            Frankfurt (Supabase, EU-Region) gespeichert. Die Datenübertragung ist
            TLS-verschlüsselt.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">4. Rechtsgrundlage</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>Art. 6 Abs. 1 lit. b DSGVO — Vertragserfüllung (Account, Mängelmeldung)</li>
            <li>Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse (Sicherheit, Rate-Limiting)</li>
            <li>Art. 6 Abs. 1 lit. a DSGVO — Einwilligung (optionale Funktionen)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">5. Drittanbieter (Auftragsverarbeiter)</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>Supabase</strong> (Hosting & Datenbank, EU-Region Frankfurt) — Auftragsverarbeitung
              gemäß Art. 28 DSGVO.
            </li>
            <li>
              <strong>Vercel</strong> (Frontend-Hosting) — Auftragsverarbeitung gemäß Art. 28 DSGVO.
            </li>
            <li>
              <strong>Resend</strong> (E-Mail-Versand, EU-Region) — für Auth- und
              System-Benachrichtigungen.
            </li>
            <li>
              <strong>Mapbox</strong> (Karten + Adresssuche) — Daten werden an Mapbox übertragen,
              wenn Sie eine Adresse eingeben.
            </li>
            <li>
              <strong>Google</strong> (nur wenn Sie sich per Google anmelden) — Sie verlassen kurz
              unsere Seite zur Google-Anmeldung.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">6. Cookies</h2>
          <p>
            Wir verwenden ausschließlich technisch notwendige Cookies (Session-Cookies von
            Supabase Auth). Diese sind für den Login zwingend erforderlich. Es werden keine
            Tracking- oder Analyse-Cookies gesetzt.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">7. Ihre Rechte</h2>
          <p>Sie haben jederzeit das Recht auf:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO)</li>
            <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
            <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
            <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruch (Art. 21 DSGVO)</li>
            <li>Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
          </ul>
          <p>Zur Ausübung Ihrer Rechte schreiben Sie uns an info@abdullahu.de.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">8. Speicherdauer</h2>
          <p>
            Ihre Daten werden nur so lange gespeichert, wie es für die Vertragserfüllung notwendig
            ist. Nach Account-Löschung werden alle personenbezogenen Daten innerhalb von 30 Tagen
            entfernt, soweit keine gesetzlichen Aufbewahrungsfristen (z. B. Steuerrecht) entgegenstehen.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">9. Account-Löschung</h2>
          <p>
            Sie können Ihren Account jederzeit löschen lassen, indem Sie eine E-Mail an
            info@abdullahu.de senden. Wir bestätigen die Löschung schriftlich innerhalb von 7
            Werktagen.
          </p>
        </section>

        <p className="pt-4 text-xs text-muted-foreground">
          ⚠ Hinweis für den Betreiber: Diese Datenschutzerklärung ist eine Vorlage und sollte vor
          Live-Schaltung durch einen Anwalt geprüft und an Ihre konkreten Verarbeitungstätigkeiten
          angepasst werden.
        </p>
      </article>
    </main>
  );
}
