import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const intendedRole = searchParams.get('role'); // tenant | landlord — von Signup-Page

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data: sessionData, error: sessionErr } = await supabase.auth.exchangeCodeForSession(code);

    // Wenn der User über Google/OAuth kam und beim Signup eine bestimmte Rolle wählte,
    // setzen wir die Rolle direkt im profile. Der DB-Trigger legt das Profile mit
    // Default-Rolle "tenant" an — wir aktualisieren ggf. auf "landlord".
    if (
      !sessionErr &&
      sessionData.user &&
      (intendedRole === 'landlord' || intendedRole === 'tenant')
    ) {
      try {
        const service = createSupabaseServiceClient();
        // Nur updaten wenn das Profil noch keine "starke" Rolle hat:
        // wenn es schon "admin" ist, NICHT überschreiben.
        const { data: existing } = await service
          .from('profiles')
          .select('role')
          .eq('id', sessionData.user.id)
          .single();
        if (existing && existing.role !== 'admin' && existing.role !== intendedRole) {
          await service
            .from('profiles')
            .update({
              role: intendedRole,
              // Falls noch kein full_name aus dem Trigger gesetzt wurde, aus Google-Metadata nehmen
              full_name:
                sessionData.user.user_metadata?.full_name ??
                sessionData.user.user_metadata?.name ??
                undefined,
            })
            .eq('id', sessionData.user.id);
        }
      } catch (err) {
        // Best-Effort, nicht fatal
        console.error('[auth-callback] role-update failed', err);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
