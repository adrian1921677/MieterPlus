'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, CalendarPlus, User } from 'lucide-react';
import { APPOINTMENT_PURPOSES, type AppointmentPurpose } from '@mieterplus/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/loading';

type PropertyOption = { id: string; label: string };
type Slot = {
  id: string;
  propertyId: string;
  title: string;
  purpose: AppointmentPurpose;
  startsAt: string;
  endsAt: string;
  status: string;
  bookedBy: string | null;
  bookingNote: string | null;
};

export function AppointmentManager({
  propertyOptions,
  propLabels,
  slots,
  purposeLabels,
}: {
  propertyOptions: PropertyOption[];
  propLabels: Record<string, string>;
  slots: Slot[];
  purposeLabels: Record<AppointmentPurpose, string>;
}) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(propertyOptions[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState<AppointmentPurpose>('maintenance');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!date || !startTime || !endTime) {
      setError('Bitte Datum, Start- und Endzeit angeben.');
      return;
    }
    setSaving(true);
    try {
      const startsAt = new Date(`${date}T${startTime}`).toISOString();
      const endsAt = new Date(`${date}T${endTime}`).toISOString();
      const res = await fetch('/api/appointments/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: propertyId, title: title.trim() || purposeLabels[purpose], purpose, starts_at: startsAt, ends_at: endsAt }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error?.message ?? 'Slot konnte nicht erstellt werden.');
        return;
      }
      setTitle('');
      setDate('');
      setStartTime('');
      setEndTime('');
      router.refresh();
    } catch {
      setError('Netzwerkfehler.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (slotId: string) => {
    if (!confirm('Termin wirklich löschen?')) return;
    const res = await fetch(`/api/appointments/${slotId}/delete`, { method: 'POST' });
    if (res.ok) router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Neuer Slot */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Neuen Termin-Slot anbieten</CardTitle>
          <CardDescription>Mieter sehen offene Slots und können sie buchen.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prop">Immobilie</Label>
                <select
                  id="prop"
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {propertyOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purpose">Zweck</Label>
                <select
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as AppointmentPurpose)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {APPOINTMENT_PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {purposeLabels[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titel (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Heizungswartung"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="date">Datum</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start">Von</Label>
                <Input id="start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">Bis</Label>
                <Input id="end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Spinner /> : <CalendarPlus className="h-4 w-4" />}
              {saving ? 'Wird erstellt …' : 'Slot anbieten'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Slot-Liste */}
      {slots.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Noch keine Termine</CardTitle>
            <CardDescription>Biete deinen ersten Termin-Slot an.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {slots.map((slot) => {
            const start = new Date(slot.startsAt);
            const end = new Date(slot.endsAt);
            const booked = slot.status === 'booked';
            return (
              <li key={slot.id}>
                <Card className={booked ? 'border-l-4 border-emerald-300' : 'border-l-4 border-amber-300'}>
                  <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{slot.title}</span>
                        <Badge variant="outline">{purposeLabels[slot.purpose]}</Badge>
                        {booked ? (
                          <Badge variant="success">Gebucht</Badge>
                        ) : (
                          <Badge variant="warning">Offen</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {start.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} ·{' '}
                        {start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}–
                        {end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} ·{' '}
                        {propLabels[slot.propertyId] ?? ''}
                      </div>
                      {booked && slot.bookedBy && (
                        <div className="flex items-center gap-1 text-xs text-emerald-700">
                          <User className="h-3 w-3" /> {slot.bookedBy}
                          {slot.bookingNote ? ` · „${slot.bookingNote}"` : ''}
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => remove(slot.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
