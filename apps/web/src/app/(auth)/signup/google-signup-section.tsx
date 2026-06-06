'use client';

import { useState } from 'react';
import { GoogleAuthButton } from '@/components/google-auth-button';
import { AppleAuthButton } from '@/components/apple-auth-button';

/**
 * Signup-Block: Erst Rolle wählen (Mieter / Vermieter), dann mit Google
 * fortfahren. Die gewählte Rolle wird beim Callback ins Profil geschrieben.
 */
export function GoogleSignupSection() {
  const [role, setRole] = useState<'tenant' | 'landlord'>('tenant');

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Ich bin…</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setRole('tenant')}
          className={`rounded-md border p-3 text-sm font-medium transition ${
            role === 'tenant'
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-zinc-200 hover:bg-accent'
          }`}
        >
          Mieter
        </button>
        <button
          type="button"
          onClick={() => setRole('landlord')}
          className={`rounded-md border p-3 text-sm font-medium transition ${
            role === 'landlord'
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-zinc-200 hover:bg-accent'
          }`}
        >
          Vermieter
        </button>
      </div>

      <div className="space-y-2">
        <GoogleAuthButton
          label={role === 'landlord' ? 'Als Vermieter mit Google' : 'Als Mieter mit Google'}
          intendedRole={role}
        />
        <AppleAuthButton
          label={role === 'landlord' ? 'Als Vermieter mit Apple' : 'Als Mieter mit Apple'}
          intendedRole={role}
        />
      </div>
    </div>
  );
}
