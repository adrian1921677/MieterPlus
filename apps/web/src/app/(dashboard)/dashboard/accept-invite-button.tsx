'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/loading';

export function AcceptInviteButton({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/managers/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: assignmentId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error?.message ?? 'Annehmen fehlgeschlagen.');
        return;
      }
      window.location.href = '/dashboard';
    } catch {
      setError('Netzwerkfehler.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={accept} disabled={loading}>
        {loading ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        Einladung annehmen
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
