'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function IdentityReviewActions({ userId }: { userId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'choose' | 'verify' | 'reject'>('choose');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (decision: 'verified' | 'rejected') => {
    if (decision === 'rejected' && reason.trim().length < 5) {
      setError('Bitte gib eine Begründung an (min. 5 Zeichen).');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/review-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          decision,
          reason: decision === 'rejected' ? reason : undefined,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error?.message ?? `Fehler ${res.status}`);
      router.push('/dashboard/admin/identity-verifications');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Entscheidung</CardTitle>
      </CardHeader>
      <CardContent>
        {mode === 'choose' && (
          <div className="flex gap-2">
            <Button onClick={() => setMode('verify')} className="flex-1" disabled={submitting}>
              <Check className="h-4 w-4" />
              Identität bestätigen
            </Button>
            <Button
              variant="destructive"
              onClick={() => setMode('reject')}
              className="flex-1"
              disabled={submitting}
            >
              <X className="h-4 w-4" />
              Ablehnen
            </Button>
          </div>
        )}

        {mode === 'verify' && (
          <div className="space-y-3">
            <p className="text-sm">
              Bestätigst du, dass der Name auf dem Personalausweis mit dem Profil übereinstimmt
              und der Ausweis gültig aussieht?
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={() => submit('verified')} disabled={submitting}>
                {submitting ? 'Wird gespeichert…' : 'Ja, bestätigen'}
              </Button>
              <Button variant="outline" onClick={() => setMode('choose')} disabled={submitting}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {mode === 'reject' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="reason">
                Begründung (wird dem Nutzer angezeigt — bitte sachlich)
              </Label>
              <Textarea
                id="reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="z.B. Personalausweis abgelaufen, Bilder unscharf, Name stimmt nicht"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => submit('rejected')}
                disabled={submitting}
              >
                {submitting ? 'Wird gespeichert…' : 'Ablehnen'}
              </Button>
              <Button variant="outline" onClick={() => setMode('choose')} disabled={submitting}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
