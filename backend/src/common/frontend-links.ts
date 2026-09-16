/**
 * Frontend pages that email links open. The frontend has to implement these
 * routes (see docs/authentication.md and docs/assessments.md).
 */
export const FRONTEND_ROUTES = {
  acceptInvitation: '/accept-invite',
  resetPassword: '/reset-password',
  takeAssessment: '/take',
} as const;

/** An absolute link to a frontend page, carrying a token as `?token=...`. */
export function frontendLink(
  frontendUrl: string,
  route: string,
  token: string,
): string {
  const url = new URL(route, frontendUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

/**
 * An absolute link to a frontend page with the token as its last path segment,
 * such as `/take/<token>`. Candidates keep and reopen this link, so it reads
 * as a page address rather than a one-off action.
 */
export function frontendPathLink(
  frontendUrl: string,
  route: string,
  token: string,
): string {
  return new URL(
    `${route}/${encodeURIComponent(token)}`,
    frontendUrl,
  ).toString();
}
