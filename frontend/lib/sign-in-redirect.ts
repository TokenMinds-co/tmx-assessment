const HOME = "/";
const LOGIN = "/login";
// Any fixed origin works here. It only tells a path on this site from a link elsewhere.
const THIS_SITE = "http://tmx-assessment.invalid";

/** The sign-in page, with `next` set so that signing in comes back to `path`. */
export function loginUrl(path: string): string {
  return path === HOME ? LOGIN : `${LOGIN}?${new URLSearchParams({ next: path })}`;
}

/**
 * Where to go after signing in: the `next` value when it's a page on this
 * site, otherwise the dashboard. Anything that resolves to another origin, such
 * as `//evil.example` or `/\evil.example`, falls back to the dashboard, so a
 * crafted link can't send someone elsewhere after they sign in.
 */
export function pathAfterSignIn(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/")) return HOME;
  try {
    const url = new URL(next, THIS_SITE);
    if (url.origin !== THIS_SITE || url.pathname === LOGIN) return HOME;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return HOME;
  }
}
