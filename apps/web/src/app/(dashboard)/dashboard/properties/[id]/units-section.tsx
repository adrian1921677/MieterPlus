'use client';

import { useEffect, useState } from 'react';
import { Plus, Copy, Check } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

// Häufige Wohnungs-Bezeichnungen — User kann mit "Andere…" auch eigenes eingeben
const STANDARD_UNIT_LABELS = [
  'EG Links',
  'EG Mitte',
  'EG Rechts',
  '1. OG Links',
  '1. OG Mitte',
  '1. OG Rechts',
  '2. OG Links',
  '2. OG Mitte',
  '2. OG Rechts',
  '3. OG Links',
  '3. OG Mitte',
  '3. OG Rechts',
  '4. OG Links',
  '4. OG Mitte',
  '4. OG Rechts',
  'Dachgeschoss Links',
  'Dachgeschoss Mitte',
  'Dachgeschoss Rechts',
  'Souterrain',
] as const;
const CUSTOM_OPTION = '__custom__';

type Unit = {
  id: string;
  unit_label: string;
  created_at: string;
};

type Invitation = {
  id: string;
  code: string;
  expires_at: string;
  used_at: string | null;
  unit_id: string;
};

export function UnitsSection({ propertyId }: { propertyId: string }) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [customLabel, setCustomLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const newLabel = selectedOption === CUSTOM_OPTION ? customLabel : selectedOption;
  const isCustom = selectedOption === CUSTOM_OPTION;

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: u } = await supabase
        .from('units')
        .select('id, unit_label, created_at')
        .eq('property_id', propertyId)
        .order('unit_label');
      setUnits(u ?? []);
      if (u && u.length > 0) {
        const { data: inv } = await supabase
          .from('tenant_invitations')
          .select('id, code, expires_at, used_at, unit_id')
          .in(
            'unit_id',
            u.map((x) => x.id),
          )
          .order('created_at', { ascending: false });
        setInvitations(inv ?? []);
      }
    })();
  }, [propertyId]);

  const addUnit = async () => {
    if (newLabel.trim().length < 1) return;
    setCreating(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error: insErr } = await supabase
      .from('units')
      .insert({ property_id: propertyId, unit_label: newLabel.trim() })
      .select('id, unit_label, created_at')
      .single();
    if (insErr) {
      // Häufigster RLS-Fehler in deutsche Erklärung übersetzen
      if (/row-level security/i.test(insErr.message)) {
        setError(
          'Du kannst hier keine Wohneinheit anlegen. Mögliche Ursachen: ' +
            '1) Die Immobilie ist noch nicht „verifiziert" (Status muss „verified" sein). ' +
            '2) Du bist nicht der Eigentümer dieser Immobilie. ' +
            '3) Du bist als Administrator eingeloggt — Admins prüfen nur, das Anlegen muss der Vermieter selbst machen.',
        );
      } else if (/duplicate|unique/i.test(insErr.message)) {
        setError('Eine Wohneinheit mit dieser Bezeichnung existiert bereits in dieser Immobilie.');
      } else {
        setError(insErr.message);
      }
    } else if (data) {
      setUnits((prev) => [...prev, data].sort((a, b) => a.unit_label.localeCompare(b.unit_label)));
      setSelectedOption('');
      setCustomLabel('');
    }
    setCreating(false);
  };

  const generateCode = async (unitId: string) => {
    setError(null);
    const res = await fetch('/api/landlord/generate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unit_id: unitId }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(payload?.error?.message ?? `Code-Erstellung fehlgeschlagen (${res.status})`);
      return;
    }
    setInvitations((prev) => [payload.invitation, ...prev]);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wohneinheiten</CardTitle>
        <CardDescription>
          Lege jede Wohnung an. Generiere dann einen Einladungscode und gib ihn deinem Mieter.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="unit-select">Wohnung wählen</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              id="unit-select"
              value={selectedOption}
              onChange={(e) => {
                setSelectedOption(e.target.value);
                if (e.target.value !== CUSTOM_OPTION) setCustomLabel('');
              }}
              className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Bitte wählen —</option>
              {STANDARD_UNIT_LABELS.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
              <option value={CUSTOM_OPTION}>Andere Bezeichnung …</option>
            </select>
            {!isCustom && (
              <Button onClick={addUnit} disabled={creating || !newLabel.trim()}>
                <Plus className="h-4 w-4" />
                Anlegen
              </Button>
            )}
          </div>
          {isCustom && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder='z.B. "WE 12, Hinterhof"'
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addUnit()}
                autoFocus
              />
              <Button onClick={addUnit} disabled={creating || !customLabel.trim()}>
                <Plus className="h-4 w-4" />
                Anlegen
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {units.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Noch keine Wohneinheiten angelegt.
          </p>
        ) : (
          <ul className="space-y-3">
            {units.map((unit) => {
              const unitInvitations = invitations.filter((i) => i.unit_id === unit.id);
              const activeCode = unitInvitations.find(
                (i) => !i.used_at && new Date(i.expires_at) > new Date(),
              );
              const tenantClaimed = unitInvitations.find((i) => !!i.used_at);

              return (
                <li key={unit.id} className="rounded-md border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{unit.unit_label}</div>
                      {tenantClaimed ? (
                        <Badge variant="success" className="mt-1">
                          Mieter registriert
                        </Badge>
                      ) : activeCode ? (
                        <Badge variant="info" className="mt-1">
                          Code aktiv
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="mt-1">
                          Kein aktiver Code
                        </Badge>
                      )}
                    </div>
                    {!tenantClaimed && !activeCode && (
                      <Button size="sm" onClick={() => generateCode(unit.id)}>
                        Code generieren
                      </Button>
                    )}
                  </div>
                  {activeCode && (
                    <div className="mt-3 flex items-center gap-2 rounded-md bg-muted p-3">
                      <code className="flex-1 font-mono text-lg tracking-wider">
                        {activeCode.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCode(activeCode.code)}
                      >
                        {copiedCode === activeCode.code ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        läuft am {formatDate(activeCode.expires_at)} ab
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
