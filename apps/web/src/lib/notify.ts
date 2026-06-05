import 'server-only';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'Mieter Plus <noreply@abdullahu.de>';
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

type NotifyPayload = {
  title: string;
  /** Plaintext / einfacher Text fürs Push + E-Mail-Fallback */
  body: string;
  /** Optionaler HTML-Body für die E-Mail */
  html?: string;
  /** Optionale Daten fürs Push (Deep-Link etc.) */
  data?: Record<string, unknown>;
};

/**
 * Benachrichtigt einen User per E-Mail (Resend) UND Push (Expo).
 * Beides best-effort — Fehler werden geloggt, aber nicht geworfen.
 */
export async function notifyUser(userId: string, payload: NotifyPayload): Promise<void> {
  await Promise.allSettled([sendEmailToUser(userId, payload), sendPushToUser(userId, payload)]);
}

async function sendEmailToUser(userId: string, payload: NotifyPayload): Promise<void> {
  if (!RESEND_API_KEY) return; // E-Mail-Versand nicht konfiguriert
  try {
    const service = createSupabaseServiceClient();
    const { data } = await service.auth.admin.getUserById(userId);
    const email = data.user?.email;
    if (!email) return;

    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: RESEND_FROM,
      to: email,
      subject: payload.title,
      html: payload.html ?? defaultHtml(payload.title, payload.body),
      text: payload.body,
    });
  } catch (err) {
    console.error('[notify:email]', err);
  }
}

async function sendPushToUser(userId: string, payload: NotifyPayload): Promise<void> {
  try {
    const service = createSupabaseServiceClient();
    const { data: tokens } = await service
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId);
    if (!tokens || tokens.length === 0) return;

    const messages = tokens.map((t) => ({
      to: t.token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }));

    await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error('[notify:push]', err);
  }
}

function defaultHtml(title: string, body: string): string {
  return `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #18181b;">
      <div style="border-bottom: 2px solid #2563a8; padding-bottom: 12px; margin-bottom: 16px;">
        <span style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #71717a;">
          ADB · Mieter +
        </span>
        <h1 style="font-size: 18px; margin: 6px 0 0;">${escapeHtml(title)}</h1>
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #52525b;">${escapeHtml(body)}</p>
      <p style="margin-top: 24px;">
        <a href="https://mieterplus.abdullahu.de/dashboard"
           style="display:inline-block; background:#09090b; color:#fff; text-decoration:none; padding:10px 20px; border-radius:2px; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">
          Zum Dashboard
        </a>
      </p>
      <p style="margin-top: 24px; font-size: 11px; color: #a1a1aa;">
        Eine App von ADB Dienstleistungen · mieterplus.abdullahu.de
      </p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
