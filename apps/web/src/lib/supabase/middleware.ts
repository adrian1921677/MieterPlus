import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // Auth-Routen für NICHT eingeloggte User (eingeloggte werden zu /dashboard geschickt)
  const isAuthRoute =
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/forgot-password');
  // /auth/* (OAuth-Callback) MUSS public sein — der User ist beim Callback
  // noch nicht eingeloggt, die Session entsteht erst durch den Token-Exchange.
  // /reset-password ist public (kein Login-Redirect), aber KEIN isAuthRoute,
  // da die Recovery-Session sonst sofort zu /dashboard umgeleitet würde.
  const isPublic =
    path === '/' ||
    isAuthRoute ||
    path.startsWith('/reset-password') ||
    path.startsWith('/_next') ||
    path.startsWith('/api/health') ||
    path.startsWith('/auth/');

  if (!user && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', path);
    return NextResponse.redirect(loginUrl);
  }
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}
