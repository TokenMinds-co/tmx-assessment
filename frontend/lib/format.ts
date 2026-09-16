const shortDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** Up to two initials from a name: "Sam Taylor" → "ST". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** "15 Sep" from an ISO timestamp. Formatted in UTC so server and browser agree. */
export function formatShortDate(iso: string): string {
  return shortDate.format(new Date(iso));
}

/** Whole-number percentage of `part` in `whole`, or 0 when `whole` is empty. */
export function percentOf(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** "73%" from a 0–1 score, or a dash when there's none. */
export function formatPercent(score: number | null | undefined): string {
  return score === null || score === undefined ? "—" : `${Math.round(score * 100)}%`;
}

/** "7:05" from milliseconds, rounding up so the last second still shows 0:01. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** "7 min 12 s" from seconds. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest} s`;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}

const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * "15 Sep, 14:05" in the viewer's time zone. Only for data fetched in the
 * browser, since the server's time zone would differ.
 */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

const longDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** "29 September 2026" in the viewer's time zone. Browser-fetched data only. */
export function formatLongDate(iso: string): string {
  return longDate.format(new Date(iso));
}

/** "1 question", "3 questions". */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
