'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Trash2, Eye, EyeOff, CheckCheck } from 'lucide-react';
import {
  VAULT_DOCUMENT_TYPES,
  type VaultDocumentType,
} from '@mieterplus/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/loading';

type PropertyOption = { id: string; label: string };
type Access = { viewerName: string; action: string; at: string };
type Doc = {
  id: string;
  propertyId: string;
  type: VaultDocumentType;
  title: string;
  visibleToTenant: boolean;
  createdAt: string;
  accesses: Access[];
};

export function VaultManager({
  propertyOptions,
  documents,
  propLabels,
  quotaReached,
  labels,
}: {
  propertyOptions: PropertyOption[];
  documents: Doc[];
  propLabels: Record<string, string>;
  quotaReached: boolean;
  labels: Record<VaultDocumentType, string>;
}) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(propertyOptions[0]?.id ?? '');
  const [type, setType] = useState<VaultDocumentType>('lease');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [visibleToTenant, setVisibleToTenant] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError('Bitte eine Datei wählen.');
      return;
    }
    if (!title.trim()) {
      setError('Bitte einen Titel angeben.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('property_id', propertyId);
      fd.append('type', type);
      fd.append('title', title.trim());
      fd.append('visible_to_tenant', String(visibleToTenant));
      const res = await fetch('/api/vault/upload', { method: 'POST', body: fd });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error?.message ?? 'Upload fehlgeschlagen.');
        return;
      }
      setTitle('');
      setFile(null);
      router.refresh();
    } catch {
      setError('Netzwerkfehler.');
    } finally {
      setUploading(false);
    }
  };

  const openDoc = async (docId: string) => {
    const res = await fetch(`/api/vault/${docId}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'viewed' }),
    });
    const payload = await res.json().catch(() => ({}));
    if (payload.url) window.open(payload.url, '_blank');
  };

  const deleteDoc = async (docId: string) => {
    if (!confirm('Dokument wirklich löschen?')) return;
    const res = await fetch(`/api/vault/${docId}/delete`, { method: 'POST' });
    if (res.ok) router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Upload-Formular */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dokument hochladen</CardTitle>
          <CardDescription>PDF oder Bild, max. 20 MB.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={upload} className="space-y-4">
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
                <Label htmlFor="type">Typ</Label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as VaultDocumentType)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {VAULT_DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {labels[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Mietvertrag 2026"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={visibleToTenant}
                onChange={(e) => setVisibleToTenant(e.target.checked)}
                className="h-4 w-4"
              />
              Für Mieter sichtbar (Lesebestätigung wird erfasst)
            </label>

            <Label
              htmlFor="vault-file"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-zinc-300 px-4 py-3 text-sm font-medium hover:bg-muted"
            >
              <Upload className="h-4 w-4" />
              {file ? file.name : 'Datei auswählen'}
            </Label>
            <input
              id="vault-file"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/heic,image/webp"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            {quotaReached && (
              <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                Dein Kontingent ist erreicht. Lösche Dokumente oder upgrade auf Premium.
              </p>
            )}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={uploading || quotaReached}>
              {uploading ? <Spinner /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Lädt hoch …' : 'Hochladen'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Dokument-Liste */}
      {documents.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Noch keine Dokumente</CardTitle>
            <CardDescription>Lade dein erstes Dokument hoch.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {documents.map((doc) => (
            <li key={doc.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-1 items-start gap-3">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#2563a8]" />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{doc.title}</span>
                        <Badge variant="outline">{labels[doc.type]}</Badge>
                        {doc.visibleToTenant ? (
                          <Badge variant="secondary" className="gap-1">
                            <Eye className="h-3 w-3" /> Sichtbar
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <EyeOff className="h-3 w-3" /> Privat
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {propLabels[doc.propertyId] ?? ''} ·{' '}
                        {new Date(doc.createdAt).toLocaleDateString('de-DE')}
                      </div>
                      {/* Lesebestätigung */}
                      {doc.accesses.length > 0 && doc.accesses[0] ? (
                        <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCheck className="h-3.5 w-3.5" />
                          Gelesen: {doc.accesses[0].viewerName} am{' '}
                          {new Date(doc.accesses[0].at).toLocaleDateString('de-DE')}
                          {doc.accesses.length > 1 ? ` (+${doc.accesses.length - 1} weitere)` : ''}
                        </div>
                      ) : doc.visibleToTenant ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Noch nicht vom Mieter geöffnet
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => openDoc(doc.id)}>
                      <Eye className="h-3.5 w-3.5" /> Öffnen
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteDoc(doc.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
