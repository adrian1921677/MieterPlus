import Link from 'next/link';
import { Sparkles, Lock } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSubscription } from '@/lib/subscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Server-Component: rendert `children` nur, wenn der eingeloggte User
 * Premium hat (oder Admin ist). Andernfalls eine Upsell-Karte.
 *
 * Verwendung: <PremiumGate feature="Übergabeprotokoll"> … </PremiumGate>
 */
export async function PremiumGate({
  feature,
  children,
}: {
  feature: string;
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Admin-Bypass
  if (profile?.role === 'admin') return <>{children}</>;

  const sub = await getSubscription(supabase, user.id);
  if (sub.isPremium) return <>{children}</>;

  return (
    <div className="mx-auto max-w-xl animate-fade-up">
      <Card className="border-2 border-[#2563a8]/30">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#eff6ff] text-[#2563a8]">
            <Lock className="h-7 w-7" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-[#2563a8]" />
            {feature} ist ein Premium-Feature
          </CardTitle>
          <CardDescription>
            Schalte <strong>{feature}</strong> und weitere Profi-Werkzeuge mit Mieter + Premium
            frei.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <ul className="w-full space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="text-[#2563a8]">✓</span> Digitales Übergabeprotokoll mit
              Unterschrift &amp; PDF
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#2563a8]">✓</span> Dokumenten-Tresor mit Lesebestätigung
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#2563a8]">✓</span> Interaktiver Terminplaner mit
              Benachrichtigungen
            </li>
          </ul>
          <Button asChild className="mt-2 w-full">
            <Link href="/dashboard/upgrade">Auf Premium upgraden</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
