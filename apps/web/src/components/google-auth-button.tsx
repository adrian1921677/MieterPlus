'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

type Props = {
  /** Sichtbarer Button-Text. Default: "Mit Google fortfahren" */
  label?: string;
  /**
   * Rolle (nur relevant beim Signup): Wird via URL-Param `?role=` in den
   * Auth-Callback durchgereicht und dort ins Profil geschrieben.
   * Bei Login einfach weglassen.
   */
  intendedRole?: 'tenant' | 'landlord';
  /** Pfad, auf den nach erfolgreicher Anmeldung weitergeleitet wird. Default: /dashboard */
  redirectTo?: string;
};

export function GoogleAuthButton({
  label = 'Mit Google fortfahren',
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
      // Callback-URL bauen — Rolle + Final-Destination als Query-Params
      const params = new URLSearchParams();
      params.set('next', redirectTo);
      if (intendedRole) params.set('role', intendedRole);
      const callbackUrl = `${window.location.origin}/auth/callback?${params.toString()}`;

      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (oauthErr) {
        setError(oauthErr.message);
        setLoading(false);
      }
      // Bei Erfolg redirected Supabase direkt zu Google — kein weiterer Code hier.
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Google-Anmeldung fehlgeschlagen.';
      setError(`${msg} — Falls dieser Fehler bleibt, ist Google-OAuth in Supabase noch nicht aktiviert.`);
      console.error('[google-oauth]', err);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={handleClick}
        disabled={loading}
        variant="outline"
        className="w-full gap-3 border-zinc-200 bg-white text-brand hover:bg-zinc-50"
      >
        <GoogleIcon />
        {loading ? 'Wird weitergeleitet …' : label}
      </Button>
      {error && (
        <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
