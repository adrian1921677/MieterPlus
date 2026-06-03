'use client';

import { useEffect, useState } from 'react';
import { STORAGE_BUCKETS } from '@mieterplus/shared';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { FileText } from 'lucide-react';

type Attachment = {
  id: string;
  file_path: string;
  mime_type: string | null;
  created_at: string;
};

export function AttachmentGallery({ attachments }: { attachments: Attachment[] }) {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const entries: [string, string][] = [];
      for (const a of attachments) {
        const { data } = await supabase.storage
          .from(STORAGE_BUCKETS.requestAttachments)
          .createSignedUrl(a.file_path, 300);
        if (data?.signedUrl) entries.push([a.id, data.signedUrl]);
      }
      setSignedUrls(Object.fromEntries(entries));
    })();
  }, [attachments]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {attachments.map((a) => {
        const url = signedUrls[a.id];
        const isImage = a.mime_type?.startsWith('image/');
        if (!url) {
          return (
            <div key={a.id} className="aspect-square animate-pulse rounded-md bg-muted" />
          );
        }
        return (
          <a
            key={a.id}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block aspect-square overflow-hidden rounded-md border bg-muted"
          >
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">PDF öffnen</span>
              </div>
            )}
          </a>
        );
      })}
    </div>
  );
}
