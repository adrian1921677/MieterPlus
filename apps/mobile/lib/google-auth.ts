import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export type GoogleAuthResult =
  | { ok: true }
  | { ok: false; reason: 'cancelled' | 'no_code' | 'error'; message?: string };

/**
 * Startet Google-OAuth-Login via Supabase + Expo WebBrowser.
 * Wichtig: Damit der Redirect zurück in die App kommt (nicht ins Web),
 * muss die generierte Linking-URL ("mieterplus://auth-callback" in Prod,
 * "exp://…/auth-callback" in Expo Go) in Supabase als Redirect URL
 * eingetragen sein:
 *   Authentication → URL Configuration → Redirect URLs:
 *     mieterplus://**
 *     exp://**
 *
 * Optional kann `intendedRole` mitgegeben werden — beim Signup wird die
 * Rolle als query-param weitergegeben und im Callback ins Profil geschrieben.
 */
export async function signInWithGoogle(
  intendedRole?: 'tenant' | 'landlord',
): Promise<GoogleAuthResult> {
  try {
    const redirectUrl = Linking.createURL('/auth-callback');

    const queryParams: Record<string, string> = {
      prompt: 'select_account',
    };
    if (intendedRole) queryParams.role = intendedRole;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
        queryParams,
      },
    });
    if (error) return { ok: false, reason: 'error', message: error.message };
    if (!data?.url) return { ok: false, reason: 'error', message: 'Keine OAuth-URL erhalten' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
      showInRecents: false,
      preferEphemeralSession: true,
    });

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { ok: false, reason: 'cancelled' };
    }
    if (result.type !== 'success') {
      return { ok: false, reason: 'error', message: 'WebBrowser-Session unerwartet beendet' };
    }

    const url = new URL(result.url);
    const code = url.searchParams.get('code');
    // Supabase kann je nach Konfiguration auch fragment-basiert antworten
    const fragmentParams = url.hash.startsWith('#')
      ? new URLSearchParams(url.hash.slice(1))
      : new URLSearchParams();
    const fragmentToken = fragmentParams.get('access_token');

    if (!code && !fragmentToken) {
      return {
        ok: false,
        reason: 'no_code',
        message:
          'Redirect ohne Code/Token. Trage in Supabase unter Authentication → URL Configuration → Redirect URLs die Schemas "mieterplus://**" und "exp://**" ein.',
      };
    }

    if (code) {
      const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
      if (exchErr) return { ok: false, reason: 'error', message: exchErr.message };
    } else if (fragmentToken) {
      const refresh = fragmentParams.get('refresh_token');
      if (!refresh) {
        return { ok: false, reason: 'error', message: 'Token-Fragment ohne refresh_token' };
      }
      const { error: setErr } = await supabase.auth.setSession({
        access_token: fragmentToken,
        refresh_token: refresh,
      });
      if (setErr) return { ok: false, reason: 'error', message: setErr.message };
    }

    if (Platform.OS === 'ios') WebBrowser.dismissBrowser();

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: 'error',
      message: err instanceof Error ? err.message : 'Unbekannter Fehler',
    };
  }
}
