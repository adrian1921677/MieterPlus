'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_LABELS_DE, type SubscriptionPlan } from '@mieterplus/shared';

/**
 * Admin setzt den Abo-Plan eines Vermieters (manuelle Freischaltung,
 * solange/falls Stripe nicht genutzt wird).
 */
export function SubscriptionToggle({
  userId,
  initialPlan,
}: {
  userId: string;
  initialPlan: SubscriptionPlan;
  validUntil?: string | null;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<SubscriptionPlan>(initialPlan);
  const [loading, setLoading] = useState(false);

  const change = async (next: SubscriptionPlan) => {
    if (next === plan) return;
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

  return (
    <select
      value={plan}
      disabled={loading}
      onChange={(e) => change(e.target.value as SubscriptionPlan)}
      title="Abo-Plan setzen"
      className={`rounded-md border px-2 py-1 text-xs font-semibold ${
        plan === 'trial' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-[#2563a8] bg-[#eff6ff] text-[#2563a8]'
      }`}
    >
      {SUBSCRIPTION_PLANS.map((p) => (
        <option key={p} value={p}>
          {SUBSCRIPTION_PLAN_LABELS_DE[p]}
        </option>
      ))}
    </select>
  );
}
