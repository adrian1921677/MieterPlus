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
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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
      setError(insErr.message);
    } else if (data) {
      setUnits((prev) => [...prev, data].sort((a, b) => a.unit_label.localeCompare(b.unit_label)));
      setNewLabel('');
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
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="unit-label" className="sr-only">
              Wohnungsbezeichnung
            </Label>
            <Input
              id="unit-label"
              placeholder='z.B. "WE 12, 3. OG links"'
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addUnit()}
            />
          </div>
          <Button onClick={addUnit} disabled={creating || !newLabel.trim()}>
            <Plus className="h-4 w-4" />
            Anlegen
          </Button>
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
