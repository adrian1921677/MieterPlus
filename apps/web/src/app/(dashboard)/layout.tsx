import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { signOut } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { MieterPlusBrand } from '@/components/brand';
import { computeIsPremium } from '@/lib/subscription';
import { LogOut, Home, Building2, Wrench, ShieldCheck, Users, UserCheck, BadgeCheck, PlusCircle, UserCircle, Sparkles, FileSignature, FolderLock, CalendarClock } from 'lucide-react';

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

  const navItems: {
    href: string;
    label: string;
    icon: typeof Home;
    roles: string[];
    premium?: boolean;
  }[] = [
    // Mieter
    { href: '/dashboard', label: 'Übersicht', icon: Home, roles: ['tenant', 'landlord', 'admin'] },
    {
      href: '/dashboard/my-requests',
      label: 'Meine Mängel',
      icon: Wrench,
      roles: ['tenant'],
    },
    {
      href: '/dashboard/my-requests/new',
      label: 'Mangel melden',
      icon: PlusCircle,
      roles: ['tenant'],
    },
    {
      href: '/dashboard/my-documents',
      label: 'Meine Dokumente',
      icon: FolderLock,
      roles: ['tenant'],
    },
    {
      href: '/dashboard/profile',
      label: 'Mein Profil',
      icon: UserCircle,
      roles: ['tenant'],
    },
    // Vermieter
    {
      href: '/dashboard/verify-identity',
      label: profile.identity_verified_at ? 'Identität ✓' : 'Identität verifizieren',
      icon: BadgeCheck,
      roles: ['landlord'],
    },
    {
      href: '/dashboard/properties',
      label: 'Immobilien',
      icon: Building2,
      roles: ['landlord', 'admin'],
    },
    {
      href: '/dashboard/requests',
      label: 'Mängel',
      icon: Wrench,
      roles: ['landlord', 'admin'],
    },
    // Vermieter — Premium-Features
    {
      href: '/dashboard/handover',
      label: 'Übergabeprotokoll',
      icon: FileSignature,
      roles: ['landlord', 'admin'],
      premium: true,
    },
    {
      href: '/dashboard/vault',
      label: 'Dokumenten-Tresor',
      icon: FolderLock,
      roles: ['landlord', 'admin'],
    },
    {
      href: '/dashboard/appointments',
      label: 'Terminplaner',
      icon: CalendarClock,
      roles: ['landlord', 'admin'],
      premium: true,
    },
    // Admin
    {
      href: '/dashboard/admin/users',
      label: 'Alle User',
      icon: Users,
      roles: ['admin'],
    },
    {
      href: '/dashboard/admin/verifications',
      label: 'Immobilien-Prüfung',
      icon: ShieldCheck,
      roles: ['admin'],
    },
    {
      href: '/dashboard/admin/identity-verifications',
      label: 'Identitäts-Prüfung',
      icon: UserCheck,
      roles: ['admin'],
    },
  ].filter((item) => item.roles.includes(profile.role));

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-64 border-r border-zinc-100 bg-white md:flex md:flex-col">
        <div className="border-b border-zinc-100 p-6 flex justify-center">
          <Link href="/dashboard" aria-label="Mieter + Dashboard">
            <MieterPlusBrand size={104} layout="stacked" />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.premium && !isPremium && profile.role !== 'admin' && (
                  <span className="rounded bg-[#2563a8]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#2563a8]">
                    Pro
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
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
                    : profile.subscription_valid_until
                      ? `Aktiv bis ${new Date(profile.subscription_valid_until).toLocaleDateString('de-DE')}`
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
                  <Badge variant="info" className="text-[10px]">Vermieter</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">Mieter</Badge>
                )}
              </div>
            </div>
          )}

          {/* Upgrade-Hinweis für Basic-Vermieter */}
          {profile.role === 'landlord' && !isPremium && (
            <Link
              href="/dashboard/upgrade"
              className="premium-card mb-3 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold text-white shadow-card transition-transform hover:scale-[1.02]"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                <Sparkles className="premium-spark h-3.5 w-3.5 text-amber-300" />
                Auf Premium upgraden
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
        <header className="flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4 md:hidden">
          <Link href="/dashboard" aria-label="Mieter + Dashboard">
            <MieterPlusBrand size={52} layout="horizontal" />
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </header>
        <div className="container py-8">{children}</div>
      </main>
    </div>
  );
}
