'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Upload, Trash2 } from 'lucide-react';
import {
  HANDOVER_TYPES,
  HANDOVER_TYPE_LABELS_DE,
  HANDOVER_METER_LABELS_DE,
  type HandoverType,
} from '@mieterplus/shared';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type TenancyOption = { id: string; label: string };
type MeterKey = 'electricity' | 'water' | 'gas';
type RoomDraft = { label: string; notes: string; files: File[] };

const METER_KEYS: MeterKey[] = ['electricity', 'water', 'gas'];

export function NewHandoverForm({ tenancyOptions }: { tenancyOptions: TenancyOption[] }) {
  const router = useRouter();
  const [tenancyId, setTenancyId] = useState(tenancyOptions[0]?.id ?? '');
  const [type, setType] = useState<HandoverType>('move_in');
  const [meters, setMeters] = useState<Record<MeterKey, { value: string; meter_no: string }>>({
    electricity: { value: '', meter_no: '' },
    water: { value: '', meter_no: '' },
    gas: { value: '', meter_no: '' },
  });
  const [keys, setKeys] = useState<{ label: string; count: string }[]>([
    { label: 'Haustür', count: '1' },
    { label: 'Wohnungstür', count: '1' },
  ]);
  const [rooms, setRooms] = useState<RoomDraft[]>([{ label: '', notes: '', files: [] }]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  // ── Schlüssel ──
  const addKey = () => setKeys((k) => [...k, { label: '', count: '1' }]);
  const removeKey = (i: number) => setKeys((k) => k.filter((_, idx) => idx !== i));

  // ── Räume ──
  const addRoom = () => setRooms((r) => [...r, { label: '', notes: '', files: [] }]);
  const removeRoom = (i: number) => setRooms((r) => r.filter((_, idx) => idx !== i));
  const addRoomFiles = (i: number, list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => f.type.startsWith('image/'));
    setRooms((r) =>
      r.map((room, idx) =>
        idx === i ? { ...room, files: [...room.files, ...incoming].slice(0, 6) } : room,
      ),
    );
  };
  const removeRoomFile = (ri: number, fi: number) =>
    setRooms((r) =>
      r.map((room, idx) =>
        idx === ri ? { ...room, files: room.files.filter((_, x) => x !== fi) } : room,
      ),
    );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!tenancyId) {
      setError('Bitte ein Mietverhältnis wählen.');
      return;
    }
    const cleanRooms = rooms.filter((r) => r.label.trim());
    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();

      // 1) Protokoll anlegen
      setProgress('Protokoll wird erstellt …');
      const { data: userData } = await supabase.auth.getUser();
      const meterPayload: Record<string, { value: string; meter_no: string }> = {};
      for (const k of METER_KEYS) {
        if (meters[k].value || meters[k].meter_no) meterPayload[k] = meters[k];
      }
      const keyPayload = keys
        .filter((k) => k.label.trim())
        .map((k) => ({ label: k.label.trim(), count: Number(k.count) || 0 }));

      const { data: protocol, error: insErr } = await supabase
        .from('handover_protocols')
        .insert({
          tenancy_id: tenancyId,
          type,
          created_by: userData.user!.id,
          meter_readings: meterPayload,
          keys: keyPayload,
          general_notes: notes.trim(),
          status: 'awaiting_signatures',
        })
        .select('id')
        .single();

      if (insErr || !protocol) {
        setError(insErr?.message ?? 'Protokoll konnte nicht erstellt werden.');
        setSaving(false);
        return;
      }

      // 2) Räume + Fotos
      let roomIdx = 0;
      for (const room of cleanRooms) {
        setProgress(`Raum „${room.label}" wird gespeichert …`);
        const { data: roomRow, error: roomErr } = await supabase
          .from('handover_rooms')
          .insert({
            protocol_id: protocol.id,
            room_label: room.label.trim(),
            notes: room.notes.trim() || null,
            sort_order: roomIdx,
          })
          .select('id')
          .single();
        roomIdx += 1;
        if (roomErr || !roomRow) continue;

        for (const file of room.files) {
          const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
          const path = `${protocol.id}/${roomRow.id}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('handover-photos')
            .upload(path, file, { contentType: file.type, upsert: false });
          if (!upErr) {
            await supabase
              .from('handover_photos')
              .insert({ room_id: roomRow.id, file_path: path });
          }
        }
      }

      router.push(`/dashboard/handover/${protocol.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Mietverhältnis + Typ */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tenancy">Mietverhältnis</Label>
          <select
            id="tenancy"
            value={tenancyId}
            onChange={(e) => setTenancyId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {tenancyOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Art</Label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as HandoverType)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {HANDOVER_TYPES.map((t) => (
              <option key={t} value={t}>
                {HANDOVER_TYPE_LABELS_DE[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Zählerstände */}
      <div className="space-y-3">
        <Label>Zählerstände</Label>
        <div className="space-y-2">
          {METER_KEYS.map((k) => (
            <div key={k} className="grid grid-cols-1 gap-2 sm:grid-cols-[120px_1fr_1fr]">
              <span className="flex items-center text-sm font-medium text-muted-foreground">
                {HANDOVER_METER_LABELS_DE[k]}
              </span>
              <Input
                placeholder="Zählerstand"
                value={meters[k].value}
                onChange={(e) =>
                  setMeters((m) => ({ ...m, [k]: { ...m[k], value: e.target.value } }))
                }
              />
              <Input
                placeholder="Zähler-Nr. (optional)"
                value={meters[k].meter_no}
                onChange={(e) =>
                  setMeters((m) => ({ ...m, [k]: { ...m[k], meter_no: e.target.value } }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* Schlüssel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Schlüssel</Label>
          <Button type="button" variant="outline" size="sm" onClick={addKey}>
            <Plus className="h-3 w-3" /> Schlüssel
          </Button>
        </div>
        <div className="space-y-2">
          {keys.map((key, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="Bezeichnung (z.B. Haustür)"
                value={key.label}
                onChange={(e) =>
                  setKeys((k) => k.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))
                }
                className="flex-1"
              />
              <Input
                type="number"
                min={0}
                max={99}
                value={key.count}
                onChange={(e) =>
                  setKeys((k) => k.map((x, idx) => (idx === i ? { ...x, count: e.target.value } : x)))
                }
                className="w-20"
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeKey(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Räume */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Räume &amp; Zustand</Label>
          <Button type="button" variant="outline" size="sm" onClick={addRoom}>
            <Plus className="h-3 w-3" /> Raum
          </Button>
        </div>
        <div className="space-y-4">
          {rooms.map((room, i) => (
            <div key={i} className="space-y-3 rounded-md border border-zinc-200 p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Raum (z.B. Wohnzimmer)"
                  value={room.label}
                  onChange={(e) =>
                    setRooms((r) =>
                      r.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)),
                    )
                  }
                  className="flex-1"
                />
                {rooms.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRoom(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              <Textarea
                placeholder="Zustand / vorhandene Mängel …"
                rows={2}
                value={room.notes}
                onChange={(e) =>
                  setRooms((r) => r.map((x, idx) => (idx === i ? { ...x, notes: e.target.value } : x)))
                }
              />
              {/* Fotos */}
              {room.files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {room.files.map((f, fi) => (
                    <div
                      key={fi}
                      className="group relative h-16 w-16 overflow-hidden rounded border bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(f)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeRoomFile(i, fi)}
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {room.files.length < 6 && (
                <Label
                  htmlFor={`room-files-${i}`}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  <Upload className="h-3 w-3" /> Fotos hinzufügen
                </Label>
              )}
              <input
                id={`room-files-${i}`}
                type="file"
                accept="image/jpeg,image/png,image/heic,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  addRoomFiles(i, e.target.files);
                  e.target.value = '';
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Allgemeine Notizen */}
      <div className="space-y-2">
        <Label htmlFor="notes">Allgemeine Anmerkungen</Label>
        <Textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Sonstige Vereinbarungen oder Hinweise …"
        />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? (progress ?? 'Wird gespeichert …') : 'Protokoll erstellen & zur Unterschrift'}
      </Button>
    </form>
  );
}
