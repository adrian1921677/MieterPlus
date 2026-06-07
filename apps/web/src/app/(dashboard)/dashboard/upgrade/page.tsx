import { redirect } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSubscription } from '@/lib/subscription';
import { Badge } from '@/components/ui/badge';
import { UpgradePlans } from './upgrade-plans';

export const metadata = { title: 'Tarife' };

export default async function UpgradePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const sub = await getSubscription(supabase, user.id);

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-fade-up">
      <div className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-3xl font-black tracking-tight">
          <Sparkles className="h-7 w-7 text-[#2563a8]" />
          Mieter <span className="plus-pulse" aria-hidden>+</span> Tarife
        </h1>
        <p className="mt-2 text-muted-foreground">
          Wähle den Tarif, der zu deinem Portfolio passt — jederzeit kündbar.
        </p>
        {sub.isPremium && (
          <Badge variant="success" className="mt-3">
            Aktueller Tarif: {sub.plan === 'pro' ? 'Pro' : 'Plus'}
            {sub.validUntil
              ? ` · gültig bis ${new Date(sub.validUntil).toLocaleDateString('de-DE')}`
              : ''}
          </Badge>
        )}
      </div>

      <UpgradePlans currentPlan={sub.plan} />

      <p className="text-center text-xs text-muted-foreground">
        Preise inkl. MwSt. Die Online-Bezahlung wird in Kürze freigeschaltet — bis dahin aktiviert
        unser Team deinen Tarif manuell. Wende dich einfach an den Support.
      </p>
    </div>
  );
}
