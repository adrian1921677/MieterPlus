'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, Sparkles } from 'lucide-react';
import { MieterPlusBrand } from '@/components/brand';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { Button } from '@/components/ui/button';
import { NAV_ICONS, isNavItemActive, type DashboardNavLink } from '@/lib/dashboard-nav';
import { signOut } from '@/app/actions/auth';

type Props = {
  items: DashboardNavLink[];
  role: string;
  isPremium: boolean;
  fullName: string;
  identityVerified: boolean;
  validUntilLabel: string | null;
};

export function DashboardMobileNav({
  items,
  role,
  isPremium,
  fullName,
  identityVerified,
  validUntilLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Drawer bei Navigationswechsel schließen
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Body-Scroll sperren, solange der Drawer offen ist
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {/* Sticky Mobile-Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-100 bg-white/90 px-4 py-3 backdrop-blur-md md:hidden">
        <Link href="/dashboard" aria-label="Mieter + Dashboard">
          <MieterPlusBrand size={44} layout="horizontal" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menü öffnen"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-brand transition-colors hover:bg-accent active:scale-95"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-brand/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-xs flex-col bg-white shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 p-4">
          <MieterPlusBrand size={40} layout="horizontal" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Menü schließen"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const Icon = NAV_ICONS[item.iconName as keyof typeof NAV_ICONS] ?? NAV_ICONS.Home;
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-accent-adb text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.premium && !isPremium && role !== 'admin' && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      active ? 'bg-white/20 text-white' : 'bg-accent-adb/10 text-accent-adb'
                    }`}
                  >
                    Pro
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-100 p-4">
          {isPremium ? (
            <div className="premium-card mb-3 rounded-lg p-3 text-white shadow-card">
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em]">
                  <Sparkles className="premium-spark h-3.5 w-3.5 text-amber-300" />
                  Premium
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <span className="truncate">{fullName}</span>
                  {identityVerified && <VerifiedBadge size={13} label="Identität verifiziert" />}
                </div>
                <div className="mt-0.5 text-[10px] text-white/70">
                  {role === 'admin'
                    ? 'Administrator · Vollzugriff'
                    : validUntilLabel
                      ? `Aktiv bis ${validUntilLabel}`
                      : 'Aktiv'}
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <span className="truncate">{fullName}</span>
              {identityVerified && <VerifiedBadge size={14} label="Identität verifiziert" />}
            </div>
          )}

          {role === 'landlord' && (
            <Link
              href="/dashboard/upgrade"
              className="premium-card mb-3 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold text-white shadow-card transition-transform active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                <Sparkles className="premium-spark h-3.5 w-3.5 text-amber-300" />
                {isPremium ? 'Tarife verwalten' : 'Auf Premium upgraden'}
              </span>
            </Link>
          )}

          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm" className="w-full">
              <LogOut className="h-3 w-3" />
              Abmelden
            </Button>
          </form>
        </div>
      </aside>
    </>
  );
}
