'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCommentInputSchema, type CreateCommentInput } from '@mieterplus/shared';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { relativeTime } from '@/lib/utils';

export type Comment = {
  id: string;
  message: string;
  created_at: string;
  author_id: string;
  author_name: string;
  author_role: string;
};

export function CommentThread({
  requestId,
  currentUserId,
  initialComments,
}: {
  requestId: string;
  currentUserId: string;
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState(initialComments);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCommentInput>({
    resolver: zodResolver(createCommentInputSchema),
    defaultValues: { request_id: requestId },
  });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`request-comments:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'request_comments',
          filter: `request_id=eq.${requestId}`,
        },
        async (payload) => {
          // deno-lint-ignore no-explicit-any
          const c: any = payload.new;
          if (comments.some((existing) => existing.id === c.id)) return;
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', c.author_id)
            .single();
          setComments((prev) => [
            ...prev,
            {
              id: c.id,
              message: c.message,
              created_at: c.created_at,
              author_id: c.author_id,
              author_name: profile?.full_name ?? 'Unbekannt',
              author_role: profile?.role ?? 'tenant',
            },
          ]);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [requestId, comments]);

  const onSubmit = async (values: CreateCommentInput) => {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('request_comments')
      .insert({
        request_id: requestId,
        author_id: currentUserId,
        message: values.message,
      })
      .select('id, message, created_at, author_id, profiles(full_name, role)')
      .single();
    if (!error && data) {
      setComments((prev) => [
        ...prev,
        {
          id: data.id,
          message: data.message,
          created_at: data.created_at,
          author_id: data.author_id,
          // deno-lint-ignore no-explicit-any
          author_name: (data as any).profiles?.full_name ?? 'Du',
          // deno-lint-ignore no-explicit-any
          author_role: (data as any).profiles?.role ?? 'landlord',
        },
      ]);
      reset({ request_id: requestId, message: '' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Kommunikation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Noch keine Nachrichten.
          </p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => {
              const isMe = c.author_id === currentUserId;
              return (
                <li
                  key={c.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 text-sm ${
                      isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                      <span className="font-medium">{c.author_name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {c.author_role === 'landlord'
                          ? 'Vermieter'
                          : c.author_role === 'tenant'
                            ? 'Mieter'
                            : 'Admin'}
                      </Badge>
                      <span>· {relativeTime(c.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{c.message}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 border-t pt-4">
          <Textarea
            placeholder="Antwort schreiben…"
            {...register('message')}
            rows={3}
          />
          {errors.message && (
            <p className="text-sm text-destructive">{errors.message.message}</p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Wird gesendet…' : 'Senden'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
