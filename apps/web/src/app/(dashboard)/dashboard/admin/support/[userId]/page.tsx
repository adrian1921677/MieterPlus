import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { SupportChat, type SupportMessage } from '@/components/support-chat';

export const metadata = { title: 'Support-Verlauf' };

export default async function AdminSupportThreadPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') redirect('/dashboard');

  const service = createSupabaseServiceClient();
  const { data: threadUser } = await service
    .from('profiles')
    .select('full_name, role')
    .eq('id', userId)
    .single();
  if (!threadUser) notFound();

  const { data: messages } = await service
    .from('support_messages')
    .select('id, body, from_admin, sender_id, created_at')
    .eq('thread_user_id', userId)
    .order('created_at', { ascending: true });

  return (
    <div className="mx-auto max-w-2xl space-y-4 animate-fade-up">
      <Link
        href="/dashboard/admin/support"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Postfach
      </Link>

      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold tracking-tight">{threadUser.full_name}</h1>
        <Badge variant="secondary" className="text-[10px]">
          {threadUser.role === 'landlord' ? 'Vermieter' : threadUser.role === 'admin' ? 'Admin' : 'Mieter'}
        </Badge>
      </div>

      <SupportChat
        threadUserId={userId}
        currentUserId={user.id}
        isAdmin
        initialMessages={(messages ?? []) as SupportMessage[]}
      />
    </div>
  );
}
