import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { signOut } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { MieterPlusBrand } from '@/components/brand';
import { DashboardSidebarNav } from '@/components/dashboard-sidebar-nav';
import { DashboardMobileNav } from '@/components/dashboard-mobile-nav';
import { OnboardingGuide } from '@/components/onboarding-guide';
import { computeIsPremium } from '@/lib/subscription';
import { DASHBOARD_NAV_ITEMS, type DashboardNavLink } from '@/lib/dashboard-nav';
import { LogOut, Sparkles } from 'lucide-react';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, identity_verified_at, subscription_plan, subscription_valid_until')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  const isPremium = computeIsPremium(profile.subscription_plan, profile.subscription_valid_until);

  // Ist der User aktive Hausverwaltung? → bekommt Vermieter-Bereiche (gefiltert auf zugewiesene Objekte)
  const { count: managerCount } = await supabase
    .from('property_managers')
    .select('id', { count: 'exact', head: true })
    .eq('manager_id', user.id)
    .eq('status', 'active');
  const isManager = (managerCount ?? 0) > 0;

  // Navigations-Einträge filtern + dynamische Labels — serialisierbar für Client-Komponenten
  const navLinks: DashboardNavLink[] = DASHBOARD_NAV_ITEMS.filter(
    (item) => item.roles.includes(profile.role) || (item.managerVisible && isManager),
  ).map((item) => ({
    href: item.href,
    label:
      item.href === '/dashboard/verify-identity'
        ? profile.identity_verified_at
          ? 'Identität ✓'
          : 'Identität verifizieren'
        : item.label,
    iconName: item.iconName,
    premium: item.premium,
  }));

  const validUntilLabel = profile.subscription_valid_until
    ? new Date(profile.subscription_valid_until).toLocaleDateString('de-DE')
    : null;

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-64 border-r border-zinc-100 bg-white md:flex md:flex-col">
        <div className="flex justify-center border-b border-zinc-100 p-6">
          <Link href="/dashboard" aria-label="Mieter + Dashboard">
            <MieterPlusBrand size={104} layout="stacked" />
          </Link>
        </div>

        <DashboardSidebarNav items={navLinks} role={profile.role} isPremium={isPremium} />

        <div className="border-t p-4">
          {/* Premium-Kärtchen — edel mit Verlauf + Glanz */}
          {isPremium ? (
            <div className="premium-card mb-3 rounded-lg p-3 text-white shadow-card">
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em]">
                  <Sparkles className="premium-spark h-3.5 w-3.5 text-amber-300" />
                  Premium
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <span className="truncate">{profile.full_name}</span>
                  {profile.identity_verified_at && (
                    <VerifiedBadge size={13} label="Identität verifiziert" />
                  )}
                </div>
                <div className="mt-0.5 text-[10px] text-white/70">
                  {profile.role === 'admin'
                    ? 'Administrator · Vollzugriff'
                    : validUntilLabel
                      ? `Aktiv bis ${validUntilLabel}`
                      : 'Aktiv'}
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <span>{profile.full_name}</span>
                {profile.identity_verified_at && (
                  <VerifiedBadge size={14} label="Identität verifiziert" />
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {profile.role === 'admin' ? (
                  <Badge variant="destructive" className="text-[10px]">
                    Administrator · Vollzugriff
                  </Badge>
                ) : profile.role === 'landlord' ? (
                  <Badge variant="info" className="text-[10px]">
                    Vermieter
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    Mieter
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Farbiger Tarife-/Upgrade-Eintrag — dauerhaft für Vermieter */}
          {profile.role === 'landlord' && (
            <Link
              href="/dashboard/upgrade"
              data-tour="upgrade"
              className="premium-card mb-3 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold text-white shadow-card transition-transform hover:scale-[1.02]"
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

      <main className="flex-1">
        <DashboardMobileNav
          items={navLinks}
          role={profile.role}
          isPremium={isPremium}
          fullName={profile.full_name}
          identityVerified={!!profile.identity_verified_at}
          validUntilLabel={validUntilLabel}
        />
        <div className="container py-8">{children}</div>
      </main>

      {/* Onboarding-Maskottchen „Albo" — winkt unten rechts & bietet die Tour an */}
      <OnboardingGuide role={profile.role} userName={profile.full_name} />
    </div>
  );
}
