/**
 * The one way the frontend calls the backend: JSON in and out, and every
 * failure turned into an `ApiError` whose message a person can read.
 * See docs/api-client.md.
 */

const NETWORK_ERROR = "Couldn’t reach TMX HR. Check your connection and try again.";
const RATE_LIMITED = "Too many attempts. Wait a few minutes, then try again.";
const SERVER_ERROR = "Something went wrong on our side. Try again in a moment.";
const UNKNOWN_ERROR = "Something went wrong. Try again.";

export class ApiError extends Error {
  constructor(
    /** The HTTP status, or 0 when no response arrived. */
    readonly status: number,
    /** What went wrong, as sentences to show the user. Never empty. */
    readonly messages: string[],
    options?: ErrorOptions,
  ) {
    super(messages.join(" "), options);
    this.name = "ApiError";
  }
}

export interface ApiRequest extends Omit<RequestInit, "body" | "headers"> {
  /** Sent as JSON. */
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Calls the API and returns its JSON, or undefined for an empty response.
 *
 * In the browser, pass a path such as `/api/auth/login`. It goes to this app's
 * own origin, which forwards `/api/*` to the backend (next.config.ts), so the
 * session cookie travels with it. On the server, pass a full URL built from
 * `apiUrl()`, as lib/session.ts does.
 */
export async function apiFetch<T>(
  url: string,
  { body, headers, ...init }: ApiRequest = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiError(0, [NETWORK_ERROR], { cause: error });
  }

  if (!response.ok) throw await toApiError(response);
  // 202 and 204 answers have no body.
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** The message to show for a failed call, whatever was thrown. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : UNKNOWN_ERROR;
}

/**
 * Reads Nest's error body, `{ statusCode, message, error }`, where `message`
 * is a string or a list of validation messages (backend/docs/api-conventions.md).
 */
async function toApiError(response: Response): Promise<ApiError> {
  const { status } = response;
  // The rate limiter's own message ("ThrottlerException: …") isn't written for people.
  if (status === 429) return new ApiError(status, [RATE_LIMITED]);

  const body: unknown = await response.json().catch(() => null);
  const message =
    typeof body === "object" && body !== null ? (body as { message?: unknown }).message : undefined;
  const messages = (Array.isArray(message) ? message : [message]).filter(
    (item): item is string => typeof item === "string" && item !== "",
  );

  // Nest's 500 only says "Internal server error", and a proxy's 502 has no JSON at all.
  if (messages.length === 0 || status === 500) {
    return new ApiError(status, [status >= 500 ? SERVER_ERROR : UNKNOWN_ERROR]);
  }
  return new ApiError(status, messages);
}
