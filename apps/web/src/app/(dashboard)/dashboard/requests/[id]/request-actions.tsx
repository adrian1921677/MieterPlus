'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  REQUEST_STATUS_LABELS_DE,
  type RequestStatus,
} from '@mieterplus/shared';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Wrench, XCircle, Archive, RotateCcw } from 'lucide-react';

type Props = {
  requestId: string;
  currentStatus: string;
  isLandlord: boolean;
  isTenant: boolean;
};

function statusVariant(
  s: string,
): 'success' | 'warning' | 'info' | 'secondary' | 'destructive' {
  if (s === 'closed') return 'success';
  if (s === 'resolved') return 'info';
  if (s === 'in_progress') return 'warning';
  if (s === 'open') return 'warning';
  if (s === 'rejected') return 'destructive';
  return 'secondary';
}

export function RequestActions({ requestId, currentStatus, isLandlord, isTenant }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vermieter-Status-Wechsel (klassisch, über RLS)
  const landlordUpdate = async (newStatus: RequestStatus) => {
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

  // Mieter bestätigt/lehnt ab (über API-Route, weil RLS Status-Wechsel blockiert)
  const tenantConfirm = async (action: 'confirm' | 'reject') => {
    setSaving(true);
    setError(null);
    const res = await fetch('/api/tenant/confirm-resolved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, action }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(payload?.error?.message ?? 'Aktion fehlgeschlagen');
    } else {
      setStatus(payload.status ?? (action === 'confirm' ? 'closed' : 'in_progress'));
      router.refresh();
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Status</CardTitle>
            <CardDescription>
              {status === 'closed'
                ? 'Dieser Mangel ist abgeschlossen und archiviert.'
                : status === 'resolved'
                  ? 'Der Vermieter hat den Mangel als behoben markiert — wartet auf Bestätigung des Mieters.'
                  : status === 'in_progress'
                    ? 'Wird gerade bearbeitet.'
                    : status === 'rejected'
                      ? 'Diese Mangelmeldung wurde abgelehnt.'
                      : 'Offen, noch nicht in Bearbeitung.'}
            </CardDescription>
          </div>
          <Badge variant={statusVariant(status)} className="text-xs">
            {REQUEST_STATUS_LABELS_DE[status as RequestStatus]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Vermieter-Aktionen ────────────────────────────────────── */}
        {isLandlord && status !== 'closed' && (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Vermieter-Aktionen
            </p>
            <div className="flex flex-wrap gap-2">
              {status === 'open' && (
                <>
                  <Button size="sm" onClick={() => landlordUpdate('in_progress')} disabled={saving}>
                    <Wrench className="h-4 w-4" />
                    In Bearbeitung nehmen
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => landlordUpdate('rejected')}
                    disabled={saving}
                  >
                    <XCircle className="h-4 w-4" />
                    Ablehnen
                  </Button>
                </>
              )}
              {status === 'in_progress' && (
                <Button size="sm" onClick={() => landlordUpdate('resolved')} disabled={saving}>
                  <CheckCircle2 className="h-4 w-4" />
                  Als behoben markieren
                </Button>
              )}
              {status === 'resolved' && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Der Mieter muss noch bestätigen, dass der Mangel wirklich behoben wurde.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => landlordUpdate('in_progress')}
                    disabled={saving}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Doch noch in Bearbeitung
                  </Button>
                </>
              )}
              {status === 'rejected' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => landlordUpdate('open')}
                  disabled={saving}
                >
                  <RotateCcw className="h-4 w-4" />
                  Wieder öffnen
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Mieter-Aktionen ────────────────────────────────────── */}
        {isTenant && status === 'resolved' && (
          <div className="space-y-3 rounded-md border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">
              Dein Vermieter hat den Mangel als behoben markiert.
            </p>
            <p className="text-sm text-blue-900/80">
              Wenn alles wieder funktioniert, bestätige bitte — das Ticket wird dann
              geschlossen und archiviert. Falls nicht, kannst du es zurück an den Vermieter geben.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={() => tenantConfirm('confirm')} disabled={saving}>
                <Archive className="h-4 w-4" />
                Ja, behoben — Ticket schließen
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => tenantConfirm('reject')}
                disabled={saving}
              >
                <RotateCcw className="h-4 w-4" />
                Nein, noch nicht behoben
              </Button>
            </div>
          </div>
        )}

        {isTenant && status === 'closed' && (
          <p className="text-sm text-muted-foreground">
            ✓ Du hast bestätigt, dass dieser Mangel behoben ist. Das Ticket ist archiviert.
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
