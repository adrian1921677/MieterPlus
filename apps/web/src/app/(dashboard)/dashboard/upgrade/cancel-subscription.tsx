'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/loading';

export function CancelSubscription({ validUntil }: { validUntil: string | null }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/landlord/subscription/cancel', { method: 'POST' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error?.message ?? 'Kündigung fehlgeschlagen.');
        return;
      }
      const ends = payload.ends_at ?? validUntil;
      setDone(
        ends
          ? `Gekündigt. Dein Zugang bleibt bis zum ${new Date(ends).toLocaleDateString('de-DE')} aktiv.`
          : 'Dein Abo wurde gekündigt.',
      );
      router.refresh();
    } catch {
      setError('Netzwerkfehler.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4 text-sm text-amber-900">{done}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Du möchtest dein Abo beenden? Die Kündigung gilt zum Ende der bezahlten Laufzeit
          {validUntil ? ` (${new Date(validUntil).toLocaleDateString('de-DE')})` : ''}.
        </div>
        {confirming ? (
          <div className="flex shrink-0 gap-2">
            <Button variant="destructive" size="sm" onClick={cancel} disabled={loading}>
              {loading ? <Spinner className="h-3.5 w-3.5" /> : null}
              Wirklich kündigen
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={loading}>
              Abbrechen
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-destructive"
            onClick={() => setConfirming(true)}
          >
            Tarif kündigen
          </Button>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
