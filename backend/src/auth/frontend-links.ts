/**
 * Frontend pages that email links open, with `?token=...` appended. The
 * frontend has to implement these routes (see docs/authentication.md).
 */
export const FRONTEND_ROUTES = {
  acceptInvitation: '/accept-invite',
  resetPassword: '/reset-password',
} as const;

/** An absolute link to a frontend page, carrying a token from an email. */
export function frontendLink(
  frontendUrl: string,
  route: string,
  token: string,
): string {
  const url = new URL(route, frontendUrl);
  url.searchParams.set('token', token);
  return url.toString();
}
