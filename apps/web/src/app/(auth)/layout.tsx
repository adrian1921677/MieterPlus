import Link from 'next/link';
import { MieterPlusBrand } from '@/components/brand';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-zinc-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/" className="group" aria-label="Mieter + Startseite">
            <MieterPlusBrand size={48} layout="stacked" />
          </Link>
          <a
            href="https://abdullahu.de"
            className="hidden text-[12px] font-semibold uppercase tracking-[0.15em] text-zinc-400 transition-colors hover:text-brand sm:inline"
            title="Zurück zur ADB-Hauptseite"
          >
            ← ADB Hauptseite
          </a>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
      <footer className="border-t border-zinc-100 bg-surface py-6">
        <p className="mx-auto max-w-7xl px-5 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 sm:px-8 lg:px-10">
          © {new Date().getFullYear()} ADB Dienstleistungen · Mieter +
        </p>
      </footer>
    </main>
  );
}
