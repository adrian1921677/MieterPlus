'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'Backend nicht konfiguriert: Die Supabase-Umgebungsvariablen ' +
        '(NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) ' +
        'sind im Hosting-Setup nicht gesetzt.',
    );
  }
  return createBrowserClient(url, anon);
}
