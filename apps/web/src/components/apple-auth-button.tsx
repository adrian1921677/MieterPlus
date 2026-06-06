'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

type Props = {
  label?: string;
  intendedRole?: 'tenant' | 'landlord';
  redirectTo?: string;
};

export function AppleAuthButton({
  label = 'Mit Apple fortfahren',
  intendedRole,
  redirectTo = '/dashboard',
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const params = new URLSearchParams();
      params.set('next', redirectTo);
      if (intendedRole) params.set('role', intendedRole);
      const callbackUrl = `${window.location.origin}/auth/callback?${params.toString()}`;

      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: callbackUrl },
      });
      if (oauthErr) {
        setError(oauthErr.message);
        setLoading(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Apple-Anmeldung fehlgeschlagen.';
      setError(`${msg} — Falls dieser Fehler bleibt, ist Apple-OAuth in Supabase noch nicht aktiviert.`);
      console.error('[apple-oauth]', err);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full gap-2 bg-black text-white hover:bg-zinc-800"
      >
        <AppleIcon />
        {loading ? 'Wird weitergeleitet …' : label}
      </Button>
      {error && (
        <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>
      )}
    </div>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}
