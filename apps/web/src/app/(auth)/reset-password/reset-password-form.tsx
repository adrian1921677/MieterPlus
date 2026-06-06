'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/loading';

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // Prüfen, ob eine (Recovery-)Session existiert
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
    });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError('Passwort muss mindestens 10 Zeichen lang sein.');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Mindestens ein Groß-, ein Kleinbuchstabe und eine Ziffer nötig.');
      return;
    }
    if (password !== password2) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) {
        setError(updErr.message);
        return;
      }
      setDone(true);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-3 rounded-md bg-emerald-50 p-4 text-center text-sm text-emerald-900">
        <CheckCircle2 className="mx-auto h-8 w-8" />
        <p className="font-medium">Passwort geändert!</p>
        <p>Du wirst weitergeleitet …</p>
      </div>
    );
  }

  if (hasSession === false) {
    return (
      <div className="space-y-3 rounded-md bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Link ungültig oder abgelaufen</p>
        <p>
          Bitte fordere einen neuen Link an. Öffne den Link am besten direkt aus der E-Mail im
          selben Browser.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-2">
          <a href="/forgot-password">Neuen Link anfordern</a>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Neues Passwort</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Min. 10 Zeichen, mit Groß-/Kleinbuchstaben und Ziffer.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password2">Passwort wiederholen</Label>
        <Input
          id="password2"
          type="password"
          autoComplete="new-password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
        />
      </div>
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      <Button type="submit" className="w-full" disabled={loading || hasSession === null}>
        {loading ? <Spinner /> : null}
        {loading ? 'Wird gespeichert …' : 'Passwort ändern'}
      </Button>
    </form>
  );
}
