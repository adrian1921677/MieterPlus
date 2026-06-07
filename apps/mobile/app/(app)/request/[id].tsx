import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  REQUEST_CATEGORY_LABELS_DE,
  REQUEST_PRIORITY_LABELS_DE,
  REQUEST_STATUS_LABELS_DE,
  STORAGE_BUCKETS,
  type RequestCategory,
  type RequestPriority,
  type RequestStatus,
} from '@mieterplus/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type RequestDetail = {
  id: string;
  title: string;
  description: string;
  category: RequestCategory;
  priority: RequestPriority;
  status: RequestStatus;
  created_at: string;
};

type Attachment = {
  id: string;
  file_path: string;
  mime_type: string | null;
  signedUrl?: string;
};

type CommentEntry = {
  id: string;
  message: string;
  author_id: string;
  author_name: string;
  created_at: string;
};

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      const { data: r } = await supabase
        .from('requests')
        .select('id, title, description, category, priority, status, created_at')
        .eq('id', id)
        .single();
      if (r) setRequest(r as RequestDetail);

      const { data: a } = await supabase
        .from('request_attachments')
        .select('id, file_path, mime_type')
        .eq('request_id', id)
        .order('created_at');
      const withUrls = await Promise.all(
        (a ?? []).map(async (att) => {
          const { data: signed } = await supabase.storage
            .from(STORAGE_BUCKETS.requestAttachments)
            .createSignedUrl(att.file_path, 300);
          return { ...att, signedUrl: signed?.signedUrl };
        }),
      );
      setAttachments(withUrls);

      const { data: c } = await supabase
        .from('request_comments')
        .select('id, message, author_id, created_at, profiles(full_name)')
        .eq('request_id', id)
        .order('created_at');
      setComments(
        (c ?? []).map((row) => ({
          id: row.id,
          message: row.message,
          author_id: row.author_id,
          created_at: row.created_at,
          // deno-lint-ignore no-explicit-any
          author_name: (row as any).profiles?.full_name ?? 'Unbekannt',
        })),
      );
      setLoading(false);
    };
    void load();

    const channel = supabase
      .channel(`request:${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'requests', filter: `id=eq.${id}` },
        (payload) => {
          // deno-lint-ignore no-explicit-any
          setRequest((prev) => (prev ? { ...prev, ...(payload.new as any) } : prev));
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'request_comments',
          filter: `request_id=eq.${id}`,
        },
        async (payload) => {
          // deno-lint-ignore no-explicit-any
          const c: any = payload.new;
          if (comments.some((x) => x.id === c.id)) return;
          const { data: p } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', c.author_id)
            .single();
          setComments((prev) => [
            ...prev,
            {
              id: c.id,
              message: c.message,
              author_id: c.author_id,
              created_at: c.created_at,
              author_name: p?.full_name ?? 'Unbekannt',
            },
          ]);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id]);

  const send = async () => {
    if (!draft.trim() || !session?.user?.id || !id) return;
    setSending(true);
    const { error } = await supabase.from('request_comments').insert({
      request_id: id,
      author_id: session.user.id,
      message: draft.trim(),
    });
    if (!error) setDraft('');
    setSending(false);
  };

  if (loading || !request) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563a8" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-gray-50"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <Stack.Screen options={{ title: 'Anfrage' }} />
      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        contentContainerClassName="p-4"
        ListHeaderComponent={
          <View className="space-y-4">
            <View className="rounded-xl bg-white p-4">
              <View className="mb-2 flex-row flex-wrap gap-2">
                <Chip label={REQUEST_CATEGORY_LABELS_DE[request.category]} tone="muted" />
                <Chip
                  label={REQUEST_PRIORITY_LABELS_DE[request.priority]}
                  tone={
                    request.priority === 'urgent'
                      ? 'danger'
                      : request.priority === 'high'
                        ? 'warning'
                        : 'info'
                  }
                />
                <Chip
                  label={REQUEST_STATUS_LABELS_DE[request.status]}
                  tone={
                    request.status === 'resolved'
                      ? 'success'
                      : request.status === 'rejected'
                        ? 'danger'
                        : request.status === 'in_progress'
                          ? 'warning'
                          : 'info'
                  }
                />
              </View>
              <Text className="text-lg font-semibold">{request.title}</Text>
              <Text className="mt-2 text-gray-700">{request.description}</Text>
            </View>

            {attachments.length > 0 && (
              <View className="rounded-xl bg-white p-4">
                <Text className="mb-3 text-sm font-medium">Fotos</Text>
                <FlatList
                  data={attachments}
                  horizontal
                  keyExtractor={(a) => a.id}
                  ItemSeparatorComponent={() => <View className="w-2" />}
                  renderItem={({ item }) =>
                    item.signedUrl ? (
                      <Image
                        source={{ uri: item.signedUrl }}
                        className="h-24 w-24 rounded-lg"
                      />
                    ) : (
                      <View className="h-24 w-24 rounded-lg bg-gray-200" />
                    )
                  }
                />
              </View>
            )}

            <Text className="mt-2 text-sm font-medium text-gray-700">Kommunikation</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-2" />}
        renderItem={({ item }) => {
          const isMe = item.author_id === session?.user?.id;
          return (
            <View className={`max-w-[85%] ${isMe ? 'self-end' : 'self-start'}`}>
              <View
                className={`rounded-2xl px-3 py-2 ${
                  isMe ? 'bg-primary' : 'bg-white'
                }`}
              >
                {!isMe && (
                  <Text className="mb-1 text-xs font-medium text-gray-500">
                    {item.author_name}
                  </Text>
                )}
                <Text className={isMe ? 'text-white' : 'text-gray-800'}>{item.message}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text className="py-6 text-center text-sm text-gray-500">
            Noch keine Nachrichten.
          </Text>
        }
      />

      <View className="border-t border-gray-200 bg-white p-3">
        <View className="flex-row items-end gap-2">
          <TextInput
            className="max-h-32 flex-1 rounded-2xl border border-gray-300 bg-gray-50 px-4 py-2"
            placeholder="Antwort schreiben…"
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim() || sending}
            className="h-10 w-10 items-center justify-center rounded-full bg-primary disabled:opacity-50"
          >
            <Ionicons name="send" size={18} color="white" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Chip({
  label,
  tone,
}: {
  label: string;
  tone: 'muted' | 'info' | 'warning' | 'success' | 'danger';
}) {
  const colorMap = {
    muted: { bg: 'bg-gray-100', text: 'text-gray-700' },
    info: { bg: 'bg-blue-100', text: 'text-blue-800' },
    warning: { bg: 'bg-amber-100', text: 'text-amber-800' },
    success: { bg: 'bg-green-100', text: 'text-green-800' },
    danger: { bg: 'bg-red-100', text: 'text-red-800' },
  };
  const c = colorMap[tone];
  return (
    <View className={`rounded-full px-2 py-0.5 ${c.bg}`}>
      <Text className={`text-xs font-medium ${c.text}`}>{label}</Text>
    </View>
  );
}
