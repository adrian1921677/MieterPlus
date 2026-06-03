'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { FileText } from 'lucide-react';

const BUCKET = 'identity-documents';

type Doc = { id: string; document_side: string; file_path: string };

export function IdentityPreview({ docs }: { docs: Doc[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const entries: [string, string][] = [];
      for (const d of docs) {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(d.file_path, 300);
        if (data?.signedUrl) entries.push([d.id, data.signedUrl]);
      }
      setUrls(Object.fromEntries(entries));
    })();
  }, [docs]);

  if (docs.length === 0) {
    return <p className="text-sm text-muted-foreground">Keine Dokumente vorhanden.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {docs.map((d) => {
        const url = urls[d.id];
        const isPdf = d.file_path.toLowerCase().endsWith('.pdf');
        return (
          <div key={d.id} className="space-y-2">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              {d.document_side === 'front' ? 'Vorderseite' : 'Rückseite'}
            </div>
            {url ? (
              isPdf ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex aspect-[3/2] flex-col items-center justify-center gap-2 rounded-md border bg-muted p-4 hover:bg-accent"
                >
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs">PDF öffnen</span>
                </a>
              ) : (
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={d.document_side}
                    className="aspect-[3/2] w-full rounded-md border object-cover"
                  />
                </a>
              )
            ) : (
              <div className="aspect-[3/2] w-full animate-pulse rounded-md bg-muted" />
            )}
          </div>
        );
      })}
    </div>
  );
}
