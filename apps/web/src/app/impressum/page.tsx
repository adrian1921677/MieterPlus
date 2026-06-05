import Link from 'next/link';
import { MieterPlusBrand } from '@/components/brand';

export const metadata = { title: 'Impressum' };

export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-surface text-brand">
      <header className="border-b border-zinc-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/" aria-label="Mieter + Startseite">
            <MieterPlusBrand size={48} layout="horizontal" showSubtitle={false} />
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl space-y-6 px-5 py-12 sm:px-8 lg:px-10">
        <h1 className="text-display-md font-black">Impressum</h1>

        <section className="space-y-2 text-sm leading-relaxed">
          <h2 className="text-base font-bold">Angaben gemäß § 5 TMG</h2>
          <p>
            <strong>ADB Dienstleistungen</strong>
            <br />
            Inhaber: Adrian Abdullahu
            <br />
            [Straße + Hausnummer]
            <br />
            42103 Wuppertal
            <br />
            Deutschland
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed">
          <h2 className="text-base font-bold">Kontakt</h2>
          <p>
            E-Mail: info@abdullahu.de
            <br />
            Telefon: [Telefonnummer]
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed">
          <h2 className="text-base font-bold">Umsatzsteuer-ID</h2>
          <p>
            Umsatzsteuer-Identifikationsnummer gemäß §27 a Umsatzsteuergesetz: [USt-ID]
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed">
          <h2 className="text-base font-bold">
            Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
          </h2>
          <p>Adrian Abdullahu (Anschrift wie oben)</p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed">
          <h2 className="text-base font-bold">Haftungsausschluss</h2>
          <p>
            Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
            Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
          </p>
          <p>
            Unsere Plattform Mieter <span className="plus-pulse font-black" aria-hidden>+</span>
            <span className="sr-only">Plus</span> verbindet Mieter und Vermieter zur digitalen
            Mängelmeldung. Wir haften nicht für Inhalte, die von Nutzern eingestellt werden.
          </p>
        </section>

        <p className="pt-4 text-xs text-muted-foreground">
          ⚠ Hinweis für den Betreiber: Dieses Impressum ist eine Vorlage. Bitte ergänzen Sie die
          fehlenden Pflichtangaben (Adresse, Telefon, USt-ID, ggf. Handelsregistereintrag).
        </p>
      </article>
    </main>
  );
}
