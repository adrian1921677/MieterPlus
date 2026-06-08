import Link from 'next/link';
import { MieterPlusBrand } from '@/components/brand';

export const metadata = {
  title: 'Konto löschen',
  description:
    'So löschst du dein Mieter +-Konto und welche Daten dabei entfernt werden (DSGVO Art. 17).',
};

export default function KontoLoeschenPage() {
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
          <h1 className="text-display-md font-black">Konto & Daten löschen</h1>
          <p className="mt-2 text-muted-foreground">
            Mieter + (eine App von ADB Dienstleistungen)
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-bold">So löschst du dein Konto in der App / im Web</h2>
          <ol className="ml-5 list-decimal space-y-1">
            <li>Melde dich bei Mieter + an.</li>
            <li>
              Öffne <strong>Mein Profil</strong> (in der App über das Menü, im Web über die
              Seitenleiste).
            </li>
            <li>
              Scrolle zum Abschnitt <strong>„Konto löschen"</strong>, gib zur Bestätigung das Wort{' '}
              <span className="font-mono font-bold">LÖSCHEN</span> ein und bestätige.
            </li>
          </ol>
          <p className="pt-2">
            Eingeloggt? Dann direkt hier:{' '}
            <Link href="/dashboard/profile" className="font-semibold text-accent-adb underline">
              Zum Profil &amp; Konto löschen
            </Link>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">Welche Daten gelöscht werden</h2>
          <p>Bei der Löschung werden deine personenbezogenen Daten unwiderruflich entfernt:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Name, E-Mail, Telefonnummer und Anschrift werden anonymisiert.</li>
            <li>Hochgeladene Ausweisdokumente werden vollständig aus dem Speicher gelöscht.</li>
            <li>Dein Zugang wird dauerhaft gesperrt — ein erneuter Login ist nicht möglich.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">Was aus rechtlichen Gründen erhalten bleibt</h2>
          <p>
            Datensätze, die die jeweils andere Vertragspartei rechtlich benötigt — etwa bereits
            digital unterschriebene Übergabeprotokolle oder Mängel-Kommunikation — bleiben
            referenziell erhalten, werden aber von deinem Namen entkoppelt und mit „Gelöschtes
            Konto" angezeigt. Steuerlich relevante Belege werden im Rahmen der gesetzlichen
            Aufbewahrungsfristen aufbewahrt und danach gelöscht.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">Datenauskunft (DSGVO Art. 15)</h2>
          <p>
            Vor der Löschung kannst du im Profil unter <strong>„Meine Daten"</strong> eine
            vollständige Kopie deiner Daten als Datei herunterladen.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">Hilfe / Löschung per E-Mail</h2>
          <p>
            Falls du keinen Zugriff mehr auf dein Konto hast, schreib uns an{' '}
            <a href="mailto:info@abdullahu.de" className="font-semibold text-accent-adb underline">
              info@abdullahu.de
            </a>{' '}
            — wir löschen dein Konto dann manuell.
          </p>
        </section>

        <div className="border-t border-zinc-100 pt-6 text-muted-foreground">
          <Link href="/datenschutz" className="underline">
            Zur Datenschutzerklärung
          </Link>
        </div>
      </article>
    </main>
  );
}
