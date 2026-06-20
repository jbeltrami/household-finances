import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { monthUrl } from "@/helpers/paths";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/login";
  const isAuthCallback = pathname.startsWith("/auth/callback");

  // Public marketing surface — viewable signed-out OR signed-in. Everything
  // else (the authenticated app) requires a session. Keep this list in sync
  // with the routes under src/app/(marketing)/.
  const isPublic =
    pathname === "/" ||
    pathname === "/about" ||
    pathname === "/guide" ||
    isLoginPage ||
    isAuthCallback;

  // If user is not logged in and trying to access a protected page, redirect to login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is logged in and on the login page, redirect to current month.
  // (The marketing pages stay viewable while signed in — only /login bounces.)
  if (user && isLoginPage) {
    const now = new Date();
    const url = request.nextUrl.clone();
    url.pathname = monthUrl(now.getFullYear(), now.getMonth() + 1);
    return NextResponse.redirect(url);
  }

  return response;
}

// `api|` is in the exclusion list so server-to-server endpoints
// (Vercel Cron, webhooks, internal tools) aren't redirected to /login
// when they have no session cookie. Every API route MUST authenticate
// itself in its handler — Bearer token for cron-style routes, or an
// explicit auth.getUser() check for session-style routes. See
// README.md → "Adding a new API route" for the convention.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
