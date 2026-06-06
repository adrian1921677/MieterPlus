'use client';

import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/loading';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Bitte E-Mail-Adresse eingeben.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      // Recovery-Link führt über /auth/callback → /reset-password (Session aktiv)
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (resetErr) {
        setError(resetErr.message);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-3 rounded-md bg-emerald-50 p-4 text-center text-sm text-emerald-900">
        <MailCheck className="mx-auto h-8 w-8" />
        <p className="font-medium">E-Mail unterwegs!</p>
        <p>
          Falls ein Konto mit <strong>{email}</strong> existiert, haben wir dir einen Link zum
          Zurücksetzen geschickt. Schau auch im Spam-Ordner nach.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@beispiel.de"
        />
      </div>
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Spinner /> : null}
        {loading ? 'Wird gesendet …' : 'Link zum Zurücksetzen senden'}
      </Button>
    </form>
  );
}
