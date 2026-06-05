import { MieterPlusBrand } from './brand';

/**
 * Block-Skeleton — pulsierende Box, ideal als Card-Platzhalter.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-200/80 ${className}`} />;
}

/**
 * Skeleton für eine Listen-Ansicht (z.B. /my-requests, /properties).
 */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="grid gap-3" aria-label="Lädt …">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i}>
          <div className="rounded-md border-l-4 border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Skeleton für Stats-Karten-Reihe (4 Karten).
 */
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-md border bg-white p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-2 h-7 w-10" />
        </div>
      ))}
    </div>
  );
}

/**
 * Vollflächiger Lade-Screen — wird in app/loading.tsx und (dashboard)/loading.tsx
 * als Suspense-Fallback verwendet. Zeigt das Mieter+ Branding mit Spinner.
 */
export function FullPageLoader({ text = 'Wird geladen …' }: { text?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8">
      <div className="animate-pulse">
        <MieterPlusBrand size={88} layout="stacked" />
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <svg className="h-4 w-4 animate-spin text-[#2563a8]" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
          <path
            d="M4 12a8 8 0 018-8"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
        {text}
      </div>
    </div>
  );
}

/**
 * Inline-Spinner (klein) — für Buttons + kleine Stellen.
 */
export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin text-current ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
