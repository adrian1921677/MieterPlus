import { redirect } from 'next/navigation';
import { LifeBuoy } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SupportChat, type SupportMessage } from '@/components/support-chat';

export const metadata = { title: 'Hilfe & Support' };

export default async function SupportPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: messages } = await supabase
    .from('support_messages')
    .select('id, body, from_admin, sender_id, created_at')
    .eq('thread_user_id', user.id)
    .order('created_at', { ascending: true });

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <LifeBuoy className="h-6 w-6 text-accent-adb" />
          Hilfe &amp; Support
        </h1>
        <p className="mt-1 text-muted-foreground">
          Schreib uns direkt – das Mieter +-Team antwortet dir hier im Chat.
        </p>
      </div>

      <SupportChat
        threadUserId={user.id}
        currentUserId={user.id}
        isAdmin={false}
        initialMessages={(messages ?? []) as SupportMessage[]}
      />
    </div>
  );
}
