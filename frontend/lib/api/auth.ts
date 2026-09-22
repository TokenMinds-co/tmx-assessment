import { ApiError, apiFetch } from "@/lib/api/client";

/**
 * The staff auth endpoints (backend/docs/authentication.md). Browser code
 * calls these functions; server code reads the session through lib/session.ts.
 */

/**
 * The httpOnly cookie the API sets on sign-in. Page scripts can't read it, but
 * proxy.ts and server components can.
 */
export const SESSION_COOKIE = "tmx_assessment_session";

/** How the API answers a reset or invitation link that's unknown, used or expired. */
const INVALID_LINK_MESSAGE = "This link is invalid or has expired.";

export type UserRole = "ADMIN" | "MEMBER";
export type UserStatus = "INVITED" | "ACTIVE" | "DEACTIVATED";

/** A staff account, as the API returns it. Dates are ISO 8601 strings. */
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UserEnvelope {
  user: User;
}

/** Signs in and sets the session cookie. */
export async function signIn(email: string, password: string): Promise<User> {
  const { user } = await apiFetch<UserEnvelope>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  return user;
}

/** Ends the session and clears the cookie. Succeeds even if the session had already ended. */
export function signOut(): Promise<void> {
  return apiFetch<void>("/api/auth/logout", { method: "POST" });
}

/** Emails a reset link if the account exists. The answer is the same either way. */
export function requestPasswordReset(email: string): Promise<void> {
  return apiFetch<void>("/api/auth/password/forgot", { method: "POST", body: { email } });
}

/** Sets a new password from a reset link. Every session ends, including this browser's. */
export function resetPassword(token: string, password: string): Promise<void> {
  return apiFetch<void>("/api/auth/password/reset", {
    method: "POST",
    body: { token, password },
  });
}

/**
 * Finishes an invitation: sets the password, activates the account and signs
 * the new user in. Leave `name` out to keep the name on the invitation.
 */
export async function acceptInvitation(
  token: string,
  password: string,
  name?: string,
): Promise<User> {
  const { user } = await apiFetch<UserEnvelope>("/api/auth/invitations/accept", {
    method: "POST",
    body: { token, password, name },
  });
  return user;
}

/** Whether the API turned down a reset or invitation link as unknown, used or expired. */
export function isInvalidLinkError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 400 &&
    error.messages.includes(INVALID_LINK_MESSAGE)
  );
}
