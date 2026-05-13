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
  const isHome = pathname === "/";

  // If user is not logged in and trying to access a protected page, redirect to login
  if (!user && !isLoginPage && !isAuthCallback) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is logged in and on the login page, redirect to current month
  if (user && isLoginPage) {
    const now = new Date();
    const url = request.nextUrl.clone();
    url.pathname = monthUrl(now.getFullYear(), now.getMonth() + 1);
    return NextResponse.redirect(url);
  }

  // Authenticated user landing on "/" — send them straight to the current
  // month. Doing this in the proxy (instead of inside a server component
  // that calls `redirect()`) avoids a Next.js dev-mode perf-measure
  // glitch where a short-circuiting page yields a negative-duration
  // performance mark in the browser console.
  if (user && isHome) {
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
