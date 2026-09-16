/** The backend's default address in development (backend/.env.example). */
const DEVELOPMENT_API_URL = "http://localhost:4000";

/**
 * The backend's origin, from `API_URL`. Development falls back to the backend's
 * default port; production must set it. Read by the `/api` rewrite in
 * next.config.ts and by server-side calls (docs/configuration.md).
 */
export function apiUrl(): string {
  const value =
    process.env.API_URL ||
    (process.env.NODE_ENV === "production" ? undefined : DEVELOPMENT_API_URL);
  if (!value) {
    throw new Error(
      "API_URL is not set. Set it to the backend's origin, such as https://api.example.com. See docs/configuration.md.",
    );
  }
  return new URL(value).origin;
}
