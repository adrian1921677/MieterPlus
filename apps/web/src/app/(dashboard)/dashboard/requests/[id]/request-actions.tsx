'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  REQUEST_STATUSES,
  REQUEST_STATUS_LABELS_DE,
  type RequestStatus,
} from '@mieterplus/shared';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function RequestActions({
  requestId,
  currentStatus,
  isLandlord,
}: {
  requestId: string;
  currentStatus: string;
  isLandlord: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLandlord) return null;

  const updateStatus = async (newStatus: RequestStatus) => {
    if (newStatus === status) return;
    setSaving(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: updErr } = await supabase
      .from('requests')
      .update({ status: newStatus })
      .eq('id', requestId);
    if (updErr) {
      setError(updErr.message);
    } else {
      setStatus(newStatus);
      router.refresh();
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {REQUEST_STATUSES.map((s) => (
            <Button
              key={s}
              variant={s === status ? 'default' : 'outline'}
              size="sm"
              disabled={saving}
              onClick={() => updateStatus(s)}
            >
              {REQUEST_STATUS_LABELS_DE[s]}
            </Button>
          ))}
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
