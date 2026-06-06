'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Trash2, Mail, CheckCircle2, Clock } from 'lucide-react';
import {
  MANAGER_PERMISSIONS,
  MANAGER_PERMISSION_LABELS_DE,
  MANAGER_PERMISSION_DESCRIPTIONS_DE,
  type ManagerPermission,
} from '@mieterplus/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/loading';

type PropertyOption = { id: string; label: string };
type Manager = {
  id: string;
  email: string;
  permissions: Record<string, boolean>;
  status: string;
  createdAt: string;
  propertyIds: string[];
};

export function ManagersClient({
  propertyOptions,
  propLabels,
  managers,
}: {
  propertyOptions: PropertyOption[];
  propLabels: Record<string, string>;
  managers: Manager[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [perms, setPerms] = useState<Record<ManagerPermission, boolean>>({
    requests: true,
    vault: false,
    appointments: false,
    properties: false,
  });
  const [selectedProps, setSelectedProps] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleProp = (id: string) =>
    setSelectedProps((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (selectedProps.length === 0) {
      setError('Bitte mindestens eine Immobilie auswählen.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/managers/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, permissions: perms, property_ids: selectedProps }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error?.message ?? 'Einladung fehlgeschlagen.');
        return;
      }
      setEmail('');
      setSelectedProps([]);
      router.refresh();
    } catch {
      setError('Netzwerkfehler.');
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm('Diese Hausverwaltung wirklich entfernen?')) return;
    const res = await fetch(`/api/managers/${id}/revoke`, { method: 'POST' });
    if (res.ok) router.refresh();
  };

  const activeManagers = managers.filter((m) => m.status !== 'revoked');

  return (
    <div className="space-y-6">
      {/* Einladen */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hausverwaltung einladen</CardTitle>
          <CardDescription>
            Die Person erhält eine E-Mail und sieht die Einladung nach dem Login in ihrem
            Dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={invite} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail der Hausverwaltung</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="verwaltung@beispiel.de"
              />
            </div>

            {/* Berechtigungen */}
            <div className="space-y-2">
              <Label>Berechtigungen</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {MANAGER_PERMISSIONS.map((p) => (
                  <label
                    key={p}
                    className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm transition ${
                      perms[p] ? 'border-primary bg-primary/5' : 'border-zinc-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={perms[p]}
                      onChange={(e) => setPerms((s) => ({ ...s, [p]: e.target.checked }))}
                      className="mt-0.5 h-4 w-4"
                    />
                    <span>
                      <span className="font-medium">{MANAGER_PERMISSION_LABELS_DE[p]}</span>
                      <span className="block text-xs text-muted-foreground">
                        {MANAGER_PERMISSION_DESCRIPTIONS_DE[p]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Immobilien-Auswahl */}
            <div className="space-y-2">
              <Label>Immobilien ({selectedProps.length} ausgewählt)</Label>
              <div className="max-h-48 space-y-1 overflow-auto rounded-md border border-zinc-200 p-2">
                {propertyOptions.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProps.includes(p.id)}
                      onChange={() => toggleProp(p.id)}
                      className="h-4 w-4"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Spinner /> : <UserPlus className="h-4 w-4" />}
              {saving ? 'Wird eingeladen …' : 'Einladung senden'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Liste */}
      {activeManagers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Noch keine Hausverwaltung</CardTitle>
            <CardDescription>Lade oben deine erste Hausverwaltung ein.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {activeManagers.map((m) => (
            <li key={m.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Mail className="h-4 w-4 text-[#2563a8]" />
                      <span className="font-semibold">{m.email}</span>
                      {m.status === 'active' ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Aktiv
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="gap-1">
                          <Clock className="h-3 w-3" /> Einladung offen
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {MANAGER_PERMISSIONS.filter((p) => m.permissions[p]).map((p) => (
                        <Badge key={p} variant="outline" className="text-[10px]">
                          {MANAGER_PERMISSION_LABELS_DE[p]}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {m.propertyIds.length} Immobilie(n):{' '}
                      {m.propertyIds.map((id) => propLabels[id]).filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => revoke(m.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
