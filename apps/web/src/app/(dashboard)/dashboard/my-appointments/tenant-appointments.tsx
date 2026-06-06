'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck, MapPin, CalendarPlus } from 'lucide-react';
import type { AppointmentPurpose } from '@mieterplus/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/loading';

type Slot = {
  id: string;
  title: string;
  purpose: AppointmentPurpose;
  startsAt: string;
  endsAt: string;
  status: string;
  address: string;
  mine: boolean;
};

export function TenantAppointments({
  slots,
  purposeLabels,
  booked = false,
}: {
  slots: Slot[];
  purposeLabels: Record<AppointmentPurpose, string>;
  booked?: boolean;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const book = async (slotId: string) => {
    setLoadingId(slotId);
    setError(null);
    try {
      const res = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: slotId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error?.message ?? 'Buchung fehlgeschlagen.');
        return;
      }
      router.refresh();
    } catch {
      setError('Netzwerkfehler.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      <ul className="grid gap-3">
        {slots.map((slot) => {
          const start = new Date(slot.startsAt);
          const end = new Date(slot.endsAt);
          return (
            <li key={slot.id}>
              <Card className={booked ? 'border-l-4 border-emerald-400' : ''}>
                <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{slot.title}</span>
                      <Badge variant="outline">{purposeLabels[slot.purpose]}</Badge>
                      {booked && <Badge variant="success">Gebucht</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {start.toLocaleDateString('de-DE', {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}{' '}
                      · {start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}–
                      {end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {slot.address && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {slot.address}
                      </div>
                    )}
                  </div>
                  {booked ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={`/api/appointments/${slot.id}/ics`}>
                        <CalendarPlus className="h-3.5 w-3.5" />
                        Zum Kalender
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => book(slot.id)} disabled={loadingId === slot.id}>
                      {loadingId === slot.id ? <Spinner className="h-3.5 w-3.5" /> : <CalendarCheck className="h-3.5 w-3.5" />}
                      Verbindlich buchen
                    </Button>
                  )}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
