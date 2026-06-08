import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LifeBuoy, ChevronRight } from 'lucide-react';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { relativeTime } from '@/lib/utils';

export const metadata = { title: 'Support-Postfach' };

type ThreadRow = {
  userId: string;
  name: string;
  role: string;
  lastBody: string;
  lastAt: string;
  lastFromAdmin: boolean;
  unread: number;
};

export default async function AdminSupportPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') redirect('/dashboard');

  const service = createSupabaseServiceClient();
  const { data: rows } = await service
    .from('support_messages')
    .select('id, thread_user_id, body, from_admin, read_at, created_at, profiles:thread_user_id(full_name, role)')
    .order('created_at', { ascending: false })
    .limit(2000);

  // Pro Thread aggregieren (rows ist absteigend sortiert → erster Treffer = neueste)
  const threads = new Map<string, ThreadRow>();
  for (const r of rows ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rr: any = r;
    const uid = rr.thread_user_id as string;
    let t = threads.get(uid);
    if (!t) {
      t = {
        userId: uid,
        name: rr.profiles?.full_name ?? 'Unbekannt',
        role: rr.profiles?.role ?? 'tenant',
        lastBody: rr.body,
        lastAt: rr.created_at,
        lastFromAdmin: rr.from_admin,
        unread: 0,
      };
      threads.set(uid, t);
    }
    if (!rr.from_admin && !rr.read_at) t.unread += 1;
  }
  const threadList = Array.from(threads.values()).sort(
    (a, b) => Number(b.unread > 0) - Number(a.unread > 0) || +new Date(b.lastAt) - +new Date(a.lastAt),
  );
  const totalUnread = threadList.reduce((s, t) => s + t.unread, 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <LifeBuoy className="h-6 w-6 text-accent-adb" />
          Support-Postfach
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalUnread} neu
            </Badge>
          )}
        </h1>
        <p className="mt-1 text-muted-foreground">Nachrichten von Nutzern – hier antworten.</p>
      </div>

      {threadList.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Keine Anfragen</CardTitle>
            <CardDescription>Aktuell hat dir niemand geschrieben.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {threadList.map((t) => (
              <Link
                key={t.userId}
                href={`/dashboard/admin/support/${t.userId}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{t.name}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {t.role === 'landlord' ? 'Vermieter' : t.role === 'admin' ? 'Admin' : 'Mieter'}
                    </Badge>
                    {t.unread > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        {t.unread}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {t.lastFromAdmin ? 'Du: ' : ''}
                    {t.lastBody}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {relativeTime(t.lastAt)}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
