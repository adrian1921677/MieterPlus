import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type Msg = {
  id: string;
  body: string;
  from_admin: boolean;
  created_at: string;
};

/** Admin antwortet in einem Support-Thread — Web-Pendant /dashboard/admin/support/[userId]. */
export default function SupportThreadScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { session } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [userName, setUserName] = useState('');
  const listRef = useRef<FlatList<Msg>>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const [{ data: msgs }, { data: prof }] = await Promise.all([
      supabase
        .from('support_messages')
        .select('id, body, from_admin, created_at')
        .eq('thread_user_id', userId)
        .order('created_at', { ascending: true }),
      supabase.from('profiles').select('full_name').eq('id', userId).single(),
    ]);
    setMessages((msgs ?? []) as Msg[]);
    setUserName(prof?.full_name ?? 'User');
    // Als gelesen markieren
    await supabase.rpc('mark_support_read', { p_thread: userId }).then(() => {}, () => {});
  }, [userId]);

  useEffect(() => {
    void load();
    if (!userId) return;
    const channel = supabase
      .channel(`support:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `thread_user_id=eq.${userId}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const send = async () => {
    if (!draft.trim() || !session?.user?.id || !userId) return;
    setSending(true);
    const { error } = await supabase.from('support_messages').insert({
      thread_user_id: userId,
      sender_id: session.user.id,
      from_admin: true,
      body: draft.trim(),
    });
    if (!error) setDraft('');
    setSending(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-slate-50"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <View className="border-b border-border bg-white px-4 py-3">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-2">
          <Ionicons name="chevron-back" size={18} color="#2563eb" />
          <Text className="text-base font-semibold text-foreground">{userName}</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerClassName="p-4 gap-2"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <View
            className={`max-w-[85%] rounded-2xl px-3 py-2 ${
              item.from_admin ? 'self-end bg-primary' : 'self-start bg-white'
            }`}
          >
            <Text className={item.from_admin ? 'text-white' : 'text-foreground'}>
              {item.body}
            </Text>
            <Text
              className={`mt-0.5 text-[9px] ${
                item.from_admin ? 'text-blue-200' : 'text-muted-foreground'
              }`}
            >
              {new Date(item.created_at).toLocaleString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}
      />

      <View className="border-t border-border bg-white p-3">
        <View className="flex-row items-end gap-2">
          <TextInput
            className="max-h-32 flex-1 rounded-2xl border border-input bg-slate-50 px-4 py-2 text-foreground"
            placeholder="Antwort schreiben…"
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim() || sending}
            className={`h-10 w-10 items-center justify-center rounded-full bg-primary ${
              !draft.trim() || sending ? 'opacity-50' : ''
            }`}
          >
            <Ionicons name="send" size={18} color="white" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
