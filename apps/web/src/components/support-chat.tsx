'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, LifeBuoy } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { relativeTime } from '@/lib/utils';

export type SupportMessage = {
  id: string;
  body: string;
  from_admin: boolean;
  sender_id: string | null;
  created_at: string;
};

type Props = {
  /** Thread-Owner (der User, dem der Verlauf gehört). */
  threadUserId: string;
  /** Aktuell eingeloggte User-ID. */
  currentUserId: string;
  /** Ist der aktuelle Betrachter ein Admin? */
  isAdmin: boolean;
  initialMessages: SupportMessage[];
};

export function SupportChat({ threadUserId, currentUserId, isAdmin, initialMessages }: Props) {
  const [messages, setMessages] = useState<SupportMessage[]>(initialMessages);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Realtime: neue Nachrichten dieses Threads
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`support:${threadUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `thread_user_id=eq.${threadUserId}`,
        },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const m: any = payload.new;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: m.id,
                    body: m.body,
                    from_admin: m.from_admin,
                    sender_id: m.sender_id,
                    created_at: m.created_at,
                  },
                ],
          );
        },
      )
      .subscribe();

    // Eingehende Nachrichten als gelesen markieren
    void supabase.rpc('mark_support_read', { p_thread: threadUserId });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [threadUserId]);

  // Nach unten scrollen bei neuer Nachricht
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSend = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('support_messages')
      .insert({
        thread_user_id: threadUserId,
        sender_id: currentUserId,
        from_admin: isAdmin,
        body,
      })
      .select('id, body, from_admin, sender_id, created_at')
      .single();
    setSending(false);
    if (!error && data) {
      setMessages((prev) =>
        prev.some((x) => x.id === data.id) ? prev : [...prev, data as SupportMessage],
      );
      setText('');
      // Gegenseite benachrichtigen (best-effort)
      void fetch('/api/support/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadUserId, snippet: body.slice(0, 140) }),
      }).catch(() => {});
    }
  };

  return (
    <div className="flex flex-col rounded-lg border bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: '60vh', minHeight: 280 }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
            <LifeBuoy className="h-8 w-8 text-accent-adb" />
            <p className="text-sm">
              {isAdmin
                ? 'Noch keine Nachrichten in diesem Verlauf.'
                : 'Stell uns deine Frage – wir helfen dir gern weiter.'}
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.from_admin === isAdmin;
            return (
              <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm ${
                    mine
                      ? 'rounded-br-sm bg-accent-adb text-white'
                      : 'rounded-bl-sm bg-muted text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>
                <span className="mt-1 px-1 text-[10px] text-muted-foreground">
                  {m.from_admin ? 'Support' : isAdmin ? 'Nutzer' : 'Du'} · {relativeTime(m.created_at)}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void onSend();
              }
            }}
            placeholder="Nachricht schreiben… (Enter zum Senden)"
            rows={2}
            className="flex-1 resize-none"
          />
          <Button onClick={onSend} disabled={!text.trim() || sending} size="icon" className="h-10 w-10 shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
