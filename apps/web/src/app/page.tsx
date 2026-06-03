import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      <header className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <span className="rounded bg-primary px-2 py-1 text-sm font-bold text-primary-foreground">
            ADB
          </span>
          <span className="text-xl font-semibold">MieterPlus</span>
        </div>
        <nav className="flex items-center gap-3">
          <Button asChild variant="ghost">
            <Link href="/login">Anmelden</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Konto erstellen</Link>
          </Button>
        </nav>
      </header>

      <section className="container py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Mängel melden. Aufträge verwalten.{' '}
            <span className="text-primary">Endlich einfach.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            MieterPlus verbindet Mieter und Vermieter — sicher, DSGVO-konform und ohne
            Papierkram. Eine App von ADB.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/signup?role=tenant">Als Mieter starten</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/signup?role=landlord">Als Vermieter starten</Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-5xl gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Für Mieter</CardTitle>
              <CardDescription>Mängel in 30 Sekunden gemeldet</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Foto schießen, Kategorie wählen, abschicken. Du siehst jederzeit den Status
              deiner Anfragen und chattest direkt mit deinem Vermieter.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Für Vermieter</CardTitle>
              <CardDescription>Alle Mängel an einem Ort</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Behalte den Überblick über all deine Immobilien — priorisiere, delegiere,
              dokumentiere. Mit revisionssicherem Audit-Log.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sicher &amp; konform</CardTitle>
              <CardDescription>EU-Hosting, DSGVO, Row-Level-Security</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Daten werden in Frankfurt gehostet. Verifikation per Eigentumsnachweis und
              Mieter-Code stellt sicher, dass nur Berechtigte Zugriff haben.
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="container flex flex-col items-center justify-between gap-4 py-6 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} ADB · MieterPlus</p>
          <div className="flex gap-4">
            <Link href="/datenschutz" className="hover:underline">
              Datenschutz
            </Link>
            <Link href="/impressum" className="hover:underline">
              Impressum
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
