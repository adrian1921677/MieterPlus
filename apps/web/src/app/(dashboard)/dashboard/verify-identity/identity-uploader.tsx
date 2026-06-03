'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Trash2, FileText } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

const BUCKET = 'identity-documents';

type Doc = {
  id: string;
  document_side: string;
  file_path: string;
  uploaded_at: string;
};

export function IdentityUploader({
  userId,
  initialDocs,
  canEdit,
}: {
  userId: string;
  initialDocs: Doc[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>(initialDocs);
  const [uploading, setUploading] = useState<'front' | 'back' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const front = docs.find((d) => d.document_side === 'front');
  const back = docs.find((d) => d.document_side === 'back');

  const upload = async (side: 'front' | 'back', file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('Datei ist größer als 10 MB.');
      return;
    }
    setUploading(side);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `${userId}/${side}-${Date.now()}.${ext}`;

      // existierende Datei dieser Seite löschen
      const existing = docs.find((d) => d.document_side === side);
      if (existing) {
        await supabase.storage.from(BUCKET).remove([existing.file_path]);
        await supabase.from('identity_documents').delete().eq('id', existing.id);
      }

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { data, error: dbErr } = await supabase
        .from('identity_documents')
        .insert({
          user_id: userId,
          document_side: side,
          file_path: path,
          mime_type: file.type,
        })
        .select('id, document_side, file_path, uploaded_at')
        .single();
      if (dbErr) throw dbErr;

      setDocs((prev) => [...prev.filter((d) => d.document_side !== side), data]);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
    } finally {
      setUploading(null);
    }
  };

  const remove = async (doc: Doc) => {
    if (!confirm('Wirklich löschen?')) return;
    const supabase = createSupabaseBrowserClient();
    await supabase.storage.from(BUCKET).remove([doc.file_path]);
    await supabase.from('identity_documents').delete().eq('id', doc.id);
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    router.refresh();
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Slot
        label="Vorderseite"
        doc={front}
        canEdit={canEdit}
        uploading={uploading === 'front'}
        onUpload={(f) => upload('front', f)}
        onRemove={() => front && remove(front)}
      />
      <Slot
        label="Rückseite"
        doc={back}
        canEdit={canEdit}
        uploading={uploading === 'back'}
        onUpload={(f) => upload('back', f)}
        onRemove={() => back && remove(back)}
      />
      {error && (
        <div className="col-span-full rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

function Slot({
  label,
  doc,
  canEdit,
  uploading,
  onUpload,
  onRemove,
}: {
  label: string;
  doc?: Doc;
  canEdit: boolean;
  uploading: boolean;
  onUpload: (f: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="mb-2 text-sm font-medium">{label}</div>
      {doc ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>Hochgeladen am {formatDate(doc.uploaded_at)}</span>
          </div>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onRemove}>
              <Trash2 className="h-3 w-3 text-destructive" />
              Entfernen
            </Button>
          )}
        </div>
      ) : canEdit ? (
        <>
          <label
            htmlFor={`file-${label}`}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input bg-muted/30 p-4 text-sm hover:bg-accent"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Lädt…' : 'Datei auswählen'}
          </label>
          <input
            id={`file-${label}`}
            type="file"
            accept="image/jpeg,image/png,image/heic,image/webp,application/pdf"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = '';
            }}
          />
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Nicht hochgeladen</p>
      )}
    </div>
  );
}
