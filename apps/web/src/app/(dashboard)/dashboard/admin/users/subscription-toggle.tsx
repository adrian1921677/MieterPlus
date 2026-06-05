'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/loading';

/**
 * Admin-Toggle: gewährt/entzieht einem Vermieter Premium (manuelle
 * Freischaltung, solange Stripe nicht live ist).
 */
export function SubscriptionToggle({
  userId,
  initialPlan,
  validUntil,
}: {
  userId: string;
  initialPlan: 'basic' | 'premium';
  validUntil: string | null;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = plan === 'premium' ? 'basic' : 'premium';
    setLoading(true);
    try {
      const res = await fetch('/api/admin/set-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, plan: next, months: 12 }),
      });
      if (res.ok) {
        setPlan(next);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const isPremium = plan === 'premium';

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      title={
        isPremium
          ? `Premium aktiv${validUntil ? ' bis ' + new Date(validUntil).toLocaleDateString('de-DE') : ''} — klicken zum Entziehen`
          : 'Premium gewähren (12 Monate)'
      }
      className="transition-opacity hover:opacity-80 disabled:opacity-50"
    >
      {loading ? (
        <Badge variant="outline" className="gap-1">
          <Spinner className="h-3 w-3" /> …
        </Badge>
      ) : isPremium ? (
        <Badge className="gap-1 bg-[#2563a8] text-white">
          <Sparkles className="h-3 w-3" /> Premium
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1 border-dashed">
          <Sparkles className="h-3 w-3" /> Premium geben
        </Badge>
      )}
    </button>
  );
}
