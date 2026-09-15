import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/api/auth";
import { loginUrl } from "@/lib/sign-in-redirect";

/** Pages for signed-out visitors. Every other page is for signed-in staff. */
const PUBLIC_PATHS = new Set(["/login", "/forgot-password", "/reset-password", "/accept-invite"]);

/**
 * A quick check before a staff page renders: no session cookie means signed
 * out, so go to /login, and come back after signing in. It only reads the
 * cookie and never calls the API, because it runs on every request, prefetches
 * included. A cookie isn't proof of a session, so the (app) layout still asks
 * the API (lib/session.ts). See docs/authentication.md.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname) || request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL(loginUrl(`${pathname}${search}`), request.url));
}

export const config = {
  // Skips the API (the backend answers 401 itself), Next.js's own files, and
  // files with an extension, such as the favicon and the brand images.
  matcher: ["/((?!api(?:/|$)|_next/|.*\\.\\w+$).*)"],
};
