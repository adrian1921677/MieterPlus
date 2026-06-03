import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <header className="container py-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="rounded bg-primary px-2 py-1 text-sm font-bold text-primary-foreground">
            ADB
          </span>
          <span className="text-xl font-semibold">MieterPlus</span>
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </main>
  );
}
