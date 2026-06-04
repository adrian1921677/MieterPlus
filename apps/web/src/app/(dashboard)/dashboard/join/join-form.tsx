'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TENANT_INVITATION_CODE_LENGTH } from '@mieterplus/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const isComplete = normalized.length === TENANT_INVITATION_CODE_LENGTH;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        setError('Bitte erneut anmelden.');
        return;
      }
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-tenant-code`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sess.session.access_token}`,
        },
        body: JSON.stringify({ code: normalized }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error?.message ?? 'Code konnte nicht eingelöst werden.');
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-md bg-green-50 p-4 text-sm text-green-900">
        ✓ Wohnung erfolgreich verknüpft! Du wirst weitergeleitet …
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code">Einladungscode</Label>
        <Input
          id="code"
          value={normalized}
          onChange={(e) => setCode(e.target.value)}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={TENANT_INVITATION_CODE_LENGTH}
          placeholder="ABCDE12345FG"
          className="text-center font-mono text-xl tracking-widest"
        />
        <p className="text-center text-xs text-muted-foreground">
          {normalized.length} / {TENANT_INVITATION_CODE_LENGTH} Zeichen
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <Button type="submit" className="w-full" disabled={!isComplete || submitting}>
        {submitting ? 'Wird geprüft …' : 'Code einlösen'}
      </Button>
    </form>
  );
}
