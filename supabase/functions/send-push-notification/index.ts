// Edge Function: send-push-notification
// POST /functions/v1/send-push-notification
// Body: { user_id: uuid, title: string, body: string, data?: object }
// Auth: nur intern via Service Role (NICHT vom Client aufrufen)
// Sendet Push an alle registrierten Expo-Tokens des Users.

import { errorResponse, jsonResponse, corsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const callerKey = req.headers.get('x-internal-key');
  const expectedKey = Deno.env.get('INTERNAL_FUNCTION_KEY');
  if (!expectedKey || callerKey !== expectedKey) {
    return errorResponse('Forbidden', 403);
  }

  try {
    const body = await req.json().catch(() => null);
    const userId = body?.user_id;
    const title = body?.title;
    const messageBody = body?.body;
    const data = body?.data ?? {};

    if (typeof userId !== 'string' || typeof title !== 'string' || typeof messageBody !== 'string') {
      return errorResponse('user_id, title, body sind Pflicht', 400);
    }

    const service = getServiceClient();
    const { data: tokens } = await service
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId);

    if (!tokens || tokens.length === 0) {
      return jsonResponse({ sent: 0 });
    }

    const messages = tokens.map((t) => ({
      to: t.token,
      sound: 'default',
      title,
      body: messageBody,
      data,
    }));

    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'accept-encoding': 'gzip, deflate',
        'content-type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await res.json();
    return jsonResponse({ sent: messages.length, expo_response: result });
  } catch (err) {
    console.error('send-push-notification error', err);
    return errorResponse('Interner Fehler', 500);
  }
});
