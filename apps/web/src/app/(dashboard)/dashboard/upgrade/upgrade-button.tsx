'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/loading';

export function UpgradeButton() {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setInfo(null);
    try {
      const res = await fetch('/api/landlord/subscription/checkout', { method: 'POST' });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.url) {
        window.location.href = payload.url; // → Stripe Checkout
        return;
      }
      // 503 = noch nicht konfiguriert → freundlicher Hinweis
      setInfo(
        payload?.error?.message ??
          'Die Online-Bezahlung ist noch nicht verfügbar. Bitte wende dich an den Support.',
      );
    } catch {
      setInfo('Etwas ist schiefgelaufen. Bitte versuche es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={loading} className="w-full">
        {loading ? <Spinner /> : null}
        {loading ? 'Einen Moment …' : 'Jetzt Premium holen'}
      </Button>
      {info && (
        <p className="rounded-md bg-[#eff6ff] p-3 text-center text-xs text-[#2563a8]">{info}</p>
      )}
    </div>
  );
}
