'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Download, CheckCircle2 } from 'lucide-react';
import type { VaultDocumentType } from '@mieterplus/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/loading';

type Doc = {
  id: string;
  type: VaultDocumentType;
  title: string;
  createdAt: string;
  openedAt: string | null;
};

export function TenantDocList({
  documents,
  labels,
}: {
  documents: Doc[];
  labels: Record<VaultDocumentType, string>;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const open = async (docId: string) => {
    setLoadingId(docId);
    try {
      const res = await fetch(`/api/vault/${docId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'downloaded' }),
      });
      const payload = await res.json().catch(() => ({}));
      if (payload.url) {
        window.open(payload.url, '_blank');
        router.refresh(); // aktualisiert "geöffnet am"
      }
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <ul className="grid gap-3">
      {documents.map((doc) => (
        <li key={doc.id}>
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#2563a8]" />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{doc.title}</span>
                    <Badge variant="outline">{labels[doc.type]}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Bereitgestellt am {new Date(doc.createdAt).toLocaleDateString('de-DE')}
                  </div>
                  {doc.openedAt && (
                    <div className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Von dir geöffnet am {new Date(doc.openedAt).toLocaleDateString('de-DE')}
                    </div>
                  )}
                </div>
              </div>
              <Button size="sm" onClick={() => open(doc.id)} disabled={loadingId === doc.id}>
                {loadingId === doc.id ? <Spinner className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                Öffnen
              </Button>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
