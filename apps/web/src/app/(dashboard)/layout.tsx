import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { signOut } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { MieterPlusBrand } from '@/components/brand';
import { LogOut, Home, Building2, Wrench, ShieldCheck, Users, UserCheck, BadgeCheck, PlusCircle, UserCircle } from 'lucide-react';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, identity_verified_at')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  const navItems = [
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
            <MieterPlusBrand size={72} layout="stacked" />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4">
          <div className="mb-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <span>{profile.full_name}</span>
              {profile.identity_verified_at && <VerifiedBadge size={14} label="Identität verifiziert" />}
            </div>
            <div className="mt-1">
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
            <MieterPlusBrand size={44} layout="horizontal" />
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
