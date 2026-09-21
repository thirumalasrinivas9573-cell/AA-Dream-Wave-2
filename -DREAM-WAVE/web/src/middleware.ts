import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AUTH_ROUTES } from "@/constants/auth";
import { hasSessionCookie } from "@/lib/auth/session";
import { isProtectedPath } from "@/lib/routing/protected";

/**
 * Guest auth pages are handled by GuestOnly (onboarding-aware).
 * Middleware only enforces protected-route access.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = hasSessionCookie(request.headers.get("cookie"));

  if (isProtectedPath(pathname) && !authed) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = AUTH_ROUTES.login;
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/goals/:path*",
    "/tasks/:path*",
    "/mentor/:path*",
    "/roadmap/:path*",
    "/books/:path*",
    "/reports/:path*",
    "/ai/:path*",
    "/learn/:path*",
    "/institution/:path*",
    "/research/:path*",
    "/community/:path*",
    "/workspace/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ],
};
