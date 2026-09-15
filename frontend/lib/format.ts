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
