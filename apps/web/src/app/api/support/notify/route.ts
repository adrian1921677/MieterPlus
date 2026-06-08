import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';

export const runtime = 'nodejs';

// CORS für die Mobile-App (Bearer-Token-Aufrufe)
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * Benachrichtigt die Gegenseite eines Support-Chats (best-effort).
 * - Schreibt ein User → alle Admins werden benachrichtigt.
 * - Schreibt ein Admin → der Thread-User wird benachrichtigt.
 * Auth: Cookie-Session (Web) ODER Bearer-Token (Mobile-App).
 * Body: { threadUserId: string, snippet?: string }
 */
export async function POST(request: NextRequest) {
  const service = createSupabaseServiceClient();

  // Auth: Cookie (Web) oder Bearer (Mobile)
  const authHeader = request.headers.get('authorization');
  let userId: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    const { data } = await service.auth.getUser(authHeader.slice(7));
    userId = data.user?.id ?? null;
  } else {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }
  if (!userId) return NextResponse.json({ ok: false }, { status: 401, headers: CORS });

  const { data: profile } = await service.from('profiles').select('role').eq('id', userId).single();
  const role = profile?.role;

  const body = await request.json().catch(() => ({}));
  const threadUserId = typeof body?.threadUserId === 'string' ? body.threadUserId : null;
  const snippet = typeof body?.snippet === 'string' ? body.snippet.trim().slice(0, 140) : '';
  if (!threadUserId) {
    return NextResponse.json({ ok: false }, { status: 400, headers: CORS });
  }

  if (role === 'admin') {
    // Admin → Thread-User
    await notifyUser(threadUserId, {
      title: 'Antwort vom Mieter +-Support',
      body: snippet ? `Der Support hat dir geantwortet: ${snippet}` : 'Der Support hat dir geantwortet.',
      data: { type: 'support_reply' },
    });
  } else {
    // User → alle Admins (Thread-User ist der Absender selbst)
    const { data: admins } = await service.from('profiles').select('id').eq('role', 'admin');
    await Promise.allSettled(
      (admins ?? []).map((a) =>
        notifyUser(a.id, {
          title: 'Neue Support-Anfrage',
          body: snippet ? `Neue Nachricht im Support: ${snippet}` : 'Es gibt eine neue Support-Nachricht.',
          data: { type: 'support_message', threadUserId: userId },
        }),
      ),
    );
  }

  return NextResponse.json({ ok: true }, { status: 200, headers: CORS });
}
