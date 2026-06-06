'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import {
  createRequestInputSchema,
  REQUEST_CATEGORY_LABELS_DE,
  REQUEST_CATEGORIES,
  REQUEST_PRIORITY_LABELS_DE,
  REQUEST_PRIORITIES,
  REQUEST_TEMPLATES,
  STORAGE_BUCKETS,
  MAX_ATTACHMENTS_PER_REQUEST,
  MAX_ATTACHMENT_SIZE_BYTES,
  ALLOWED_ATTACHMENT_MIME_TYPES,
  type CreateRequestInput,
} from '@mieterplus/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type TenancyOption = { id: string; label: string };

type LocalFile = {
  file: File;
  previewUrl: string | null;
};

export function NewRequestForm({ tenancyOptions }: { tenancyOptions: TenancyOption[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [tenancyId, setTenancyId] = useState<string>(tenancyOptions[0]?.id ?? '');
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateRequestInput>({
    resolver: zodResolver(createRequestInputSchema),
    defaultValues: { priority: 'normal' },
  });

  const applyTemplate = (title: string, category: (typeof REQUEST_TEMPLATES)[number]['category']) => {
    setValue('title', title, { shouldValidate: true });
    setValue('category', category, { shouldValidate: true });
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setServerError(null);
    const next: LocalFile[] = [...files];
    for (const file of Array.from(incoming)) {
      if (next.length >= MAX_ATTACHMENTS_PER_REQUEST) {
        setServerError(`Maximal ${MAX_ATTACHMENTS_PER_REQUEST} Anhänge pro Mangelmeldung.`);
        break;
      }
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        setServerError(`"${file.name}" ist größer als ${MAX_ATTACHMENT_SIZE_BYTES / 1024 / 1024} MB.`);
        continue;
      }
      if (!(ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
        setServerError(`"${file.name}" hat ein nicht erlaubtes Format (${file.type}).`);
        continue;
      }
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      next.push({ file, previewUrl });
    }
    setFiles(next);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const onSubmit = async (values: CreateRequestInput) => {
    setServerError(null);
    if (!tenancyId) {
      setServerError('Bitte eine Wohnung auswählen.');
      return;
    }
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setServerError('Bitte erneut anmelden.');
        return;
      }

      // 1) Request anlegen
      const { data: request, error: insErr } = await supabase
        .from('requests')
        .insert({
          tenancy_id: tenancyId,
          title: values.title,
          description: values.description,
          category: values.category,
          priority: values.priority,
          status: 'open',
        })
        .select('id')
        .single();

      if (insErr) {
        setServerError(insErr.message);
        return;
      }

      // 2) Fotos hochladen (best-effort: Wenn Upload scheitert, Request bleibt trotzdem)
      if (files.length > 0) {
        setUploading(true);
        const uploadErrors: string[] = [];
        for (const lf of files) {
          const file = lf.file;
          const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
          const objectName = `${crypto.randomUUID()}.${ext}`;
          const path = `${request.id}/${objectName}`;

          const { error: uploadErr } = await supabase.storage
            .from(STORAGE_BUCKETS.requestAttachments)
            .upload(path, file, { contentType: file.type, upsert: false });
          if (uploadErr) {
            uploadErrors.push(`${file.name}: ${uploadErr.message}`);
            continue;
          }

          const { error: dbErr } = await supabase.from('request_attachments').insert({
            request_id: request.id,
            file_path: path,
            mime_type: file.type,
            uploaded_by: userData.user.id,
          });
          if (dbErr) {
            uploadErrors.push(`${file.name}: ${dbErr.message}`);
          }
        }
        setUploading(false);
        if (uploadErrors.length > 0) {
          console.warn('[new-request] Anhang-Probleme:', uploadErrors);
        }
      }

      router.push(`/dashboard/requests/${request.id}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler.';
      setServerError(msg);
      console.error('[new-request]', err);
    }
  };

  const busy = isSubmitting || uploading;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {tenancyOptions.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="tenancy">Wohnung</Label>
          <select
            id="tenancy"
            value={tenancyId}
            onChange={(e) => setTenancyId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {tenancyOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Schnellauswahl-Vorlagen */}
      <div className="space-y-2">
        <Label>Häufige Mängel (Schnellauswahl)</Label>
        <div className="flex flex-wrap gap-2">
          {REQUEST_TEMPLATES.map((t) => (
            <button
              key={t.title}
              type="button"
              onClick={() => applyTemplate(t.title, t.category)}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium transition hover:border-[#2563a8] hover:bg-[#eff6ff] hover:text-[#2563a8]"
            >
              {t.title}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Titel</Label>
        <Input
          id="title"
          placeholder="z.B. Heizung im Wohnzimmer wird nicht warm"
          {...register('title')}
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Kategorie</Label>
        <select
          id="category"
          {...register('category')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Bitte wählen …</option>
          {REQUEST_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {REQUEST_CATEGORY_LABELS_DE[cat]}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="text-sm text-destructive">Bitte eine Kategorie wählen.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Dringlichkeit</Label>
        <select
          id="priority"
          {...register('priority')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {REQUEST_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {REQUEST_PRIORITY_LABELS_DE[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          rows={5}
          placeholder="Beschreibe das Problem so genau wie möglich. Wann tritt es auf? Was hast du bereits versucht?"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* ── Foto-Upload ──────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Fotos (optional)</Label>
        <p className="text-xs text-muted-foreground">
          Max. {MAX_ATTACHMENTS_PER_REQUEST} Anhänge · je max.{' '}
          {MAX_ATTACHMENT_SIZE_BYTES / 1024 / 1024} MB · JPG/PNG/HEIC/WebP/PDF
        </p>

        {files.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {files.map((lf, i) => (
              <li
                key={i}
                className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
              >
                {lf.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={lf.previewUrl} alt={lf.file.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    <span className="break-all text-[10px] text-muted-foreground">
                      {lf.file.name}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"
                  aria-label="Entfernen"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {files.length < MAX_ATTACHMENTS_PER_REQUEST && (
          <Label
            htmlFor="attachments"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-zinc-300 bg-muted/40 px-4 py-3 text-sm font-medium hover:bg-muted"
          >
            <Upload className="h-4 w-4" />
            Fotos hinzufügen
          </Label>
        )}
        <input
          id="attachments"
          type="file"
          accept={ALLOWED_ATTACHMENT_MIME_TYPES.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = ''; // erlaubt erneute Auswahl derselben Datei
          }}
          disabled={busy}
        />
      </div>

      {serverError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={busy}>
        {uploading
          ? 'Fotos werden hochgeladen …'
          : isSubmitting
            ? 'Wird gesendet …'
            : 'Mangel melden'}
      </Button>
    </form>
  );
}
