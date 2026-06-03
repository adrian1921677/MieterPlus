'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Trash2 } from 'lucide-react';
import { OWNERSHIP_DOCUMENT_TYPES, STORAGE_BUCKETS } from '@mieterplus/shared';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/utils';

type Document = {
  id: string;
  file_path: string;
  document_type: string;
  created_at: string;
};

const DOC_LABELS_DE: Record<string, string> = {
  land_register: 'Grundbuchauszug',
  notary_deed: 'Notarurkunde',
  purchase_contract: 'Kaufvertrag',
  other: 'Sonstiges',
};

export function DocumentUploader({
  propertyId,
  initialDocuments,
  canUpload,
}: {
  propertyId: string;
  initialDocuments: Document[];
  canUpload: boolean;
}) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [docType, setDocType] = useState<string>('land_register');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError('Datei ist größer als 20 MB.');
      return;
    }
    setUploading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const ext = file.name.split('.').pop() ?? 'bin';
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const path = `${propertyId}/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKETS.ownershipDocuments)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Nicht angemeldet');

      const { data, error: dbErr } = await supabase
        .from('ownership_documents')
        .insert({
          property_id: propertyId,
          file_path: path,
          document_type: docType,
          uploaded_by: userData.user.id,
        })
        .select('id, file_path, document_type, created_at')
        .single();
      if (dbErr) throw dbErr;

      setDocuments((prev) => [data, ...prev]);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload fehlgeschlagen';
      setError(message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Dokument wirklich löschen?')) return;
    const supabase = createSupabaseBrowserClient();
    await supabase.storage.from(STORAGE_BUCKETS.ownershipDocuments).remove([doc.file_path]);
    await supabase.from('ownership_documents').delete().eq('id', doc.id);
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    router.refresh();
  };

  const handleDownload = async (doc: Document) => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.storage
      .from(STORAGE_BUCKETS.ownershipDocuments)
      .createSignedUrl(doc.file_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  return (
    <div className="space-y-4">
      {canUpload && (
        <div className="rounded-md border border-dashed bg-muted/40 p-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="doc-type" className="text-xs">
                Dokumenttyp
              </Label>
              <select
                id="doc-type"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {OWNERSHIP_DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DOC_LABELS_DE[t]}
                  </option>
                ))}
              </select>
            </div>
            <Label
              htmlFor="doc-file"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-3 text-sm font-medium hover:bg-accent"
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Lädt hoch…' : 'Datei auswählen (PDF/Bild, max. 20 MB)'}
            </Label>
            <input
              id="doc-file"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/heic,image/webp"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Noch keine Dokumente hochgeladen.
        </p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between rounded-md border bg-card p-3"
            >
              <button
                onClick={() => handleDownload(doc)}
                className="flex flex-1 items-center gap-3 text-left hover:underline"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{DOC_LABELS_DE[doc.document_type]}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(doc.created_at)}
                  </div>
                </div>
              </button>
              {canUpload && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(doc)}
                  aria-label="Löschen"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
