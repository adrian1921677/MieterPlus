import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type Msg = {
  id: string;
  body: string;
  from_admin: boolean;
  created_at: string;
};

const WEB_URL =
  (Constants.expoConfig?.extra?.webApiUrl as string | undefined) ??
  'https://mieterplus.abdullahu.de';

export default function SupportScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    (async () => {
      const { data } = await supabase
        .from('support_messages')
        .select('id, body, from_admin, created_at')
        .eq('thread_user_id', userId)
        .order('created_at', { ascending: true });
      if (active) {
        setMessages((data ?? []) as Msg[]);
        setLoading(false);
      }
      void supabase.rpc('mark_support_read', { p_thread: userId });
    })();

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
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const onSend = async () => {
    const body = text.trim();
    if (!body || sending || !userId) return;
    setSending(true);
    const { data, error } = await supabase
      .from('support_messages')
      .insert({ thread_user_id: userId, sender_id: userId, from_admin: false, body })
      .select('id, body, from_admin, created_at')
      .single();
    setSending(false);
    if (!error && data) {
      setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as Msg]));
      setText('');
      // Admins benachrichtigen (best-effort, mit Bearer-Token)
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session) {
          void fetch(`${WEB_URL}/api/support/notify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sess.session.access_token}`,
            },
            body: JSON.stringify({ threadUserId: userId, snippet: body.slice(0, 140) }),
          }).catch(() => {});
        }
      } catch {
        // ignore
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
      className="flex-1 bg-gray-50"
    >
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563a8" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8 py-16">
              <Ionicons name="chatbubbles-outline" size={40} color="#2563a8" />
              <Text className="mt-3 text-center text-gray-500">
                Stell uns deine Frage – das Mieter +-Team antwortet dir hier.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const mine = !item.from_admin;
            return (
              <View className={mine ? 'items-end' : 'items-start'}>
                <View
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2 ${
                    mine ? 'rounded-br-sm bg-primary' : 'rounded-bl-sm bg-white border border-gray-200'
                  }`}
                >
                  <Text className={mine ? 'text-white' : 'text-gray-900'}>{item.body}</Text>
                </View>
                <Text className="mt-1 px-1 text-[10px] text-gray-400">
                  {item.from_admin ? 'Support' : 'Du'}
                </Text>
              </View>
            );
          }}
        />
      )}

      <View className="flex-row items-end gap-2 border-t border-gray-200 bg-white p-3">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Nachricht schreiben…"
          multiline
          className="max-h-28 flex-1 rounded-2xl border border-gray-300 px-4 py-2.5 text-base"
        />
        <Pressable
          onPress={onSend}
          disabled={!text.trim() || sending}
          className="h-11 w-11 items-center justify-center rounded-full bg-primary active:bg-primary-dark disabled:opacity-50"
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
