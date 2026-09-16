import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, type User } from "@/lib/api/auth";
import { ApiError, apiFetch } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/url";

/**
 * The signed-in staff member, or null. It asks the API each time, because a
 * cookie can outlive its session: the API ends idle sessions, and a password
 * reset signs everyone out. `cache()` keeps it to one call per request, however
 * many server components ask. See docs/authentication.md.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { user } = await apiFetch<{ user: User }>(`${apiUrl()}/api/auth/me`, {
      // A server-to-server call, so the token goes as a bearer token.
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});

/**
 * The signed-in staff member. Anyone else is sent to /login. Call it in every
 * server component, server action and route handler that loads or changes staff data.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
