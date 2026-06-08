'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CONFIRM_WORD = 'LÖSCHEN';

export function AccountDangerZone() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/account/delete', { method: 'POST' });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error?.message ?? 'Löschung fehlgeschlagen. Bitte später erneut versuchen.');
          return;
        }
        // Session ist serverseitig beendet → zur Startseite mit Hinweis
        router.replace('/?konto=geloescht');
        router.refresh();
      } catch {
        setError('Netzwerkfehler. Bitte später erneut versuchen.');
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Datenauskunft */}
      <Card>
        <CardHeader>
          <CardTitle>Meine Daten</CardTitle>
          <CardDescription>
            Lade eine vollständige Kopie der zu dir gespeicherten Daten herunter (DSGVO Art. 15).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/api/account/export">
              <Download className="h-4 w-4" />
              Datenauskunft herunterladen
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Konto löschen */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Konto löschen
          </CardTitle>
          <CardDescription>
            Deine personenbezogenen Daten werden unwiderruflich anonymisiert und dein Zugang
            wird dauerhaft gesperrt. Diese Aktion kann nicht rückgängig gemacht werden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Gib zur Bestätigung <span className="font-mono font-bold text-foreground">{CONFIRM_WORD}</span> ein:
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_WORD}
            className="max-w-xs"
            aria-label={`${CONFIRM_WORD} zur Bestätigung eingeben`}
          />
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button
            variant="destructive"
            disabled={confirmText.trim().toUpperCase() !== CONFIRM_WORD || isPending}
            onClick={onDelete}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {isPending ? 'Konto wird gelöscht…' : 'Konto endgültig löschen'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
