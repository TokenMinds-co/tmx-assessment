import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/api/auth";
import { apiFetch } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/url";

/**
 * Calls the API from a server component as the signed-in staff member,
 * sending the session token as a bearer token like lib/session.ts does. Call
 * requireUser() first. Pass a path such as `/api/assessments/…`.
 */
export async function serverApiFetch<T>(path: string): Promise<T> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return apiFetch<T>(`${apiUrl()}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}
