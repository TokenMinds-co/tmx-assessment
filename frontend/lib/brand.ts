/**
 * The company name candidates see: page titles, the wordmark's alt text, the
 * start page and the "link doesn't work" pages.
 *
 * It's an environment variable, not part of the `/take` payload, because the
 * places that need it have no payload to read: `metadata` is static, and the
 * 404 and 410 pages render when the API returned no data at all.
 *
 * Next.js inlines `NEXT_PUBLIC_*` at build time, so changing it needs a
 * rebuild, not just a restart. Keep it the same as the backend's
 * `COMPANY_NAME`, which names the company in candidates' emails.
 */
export const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "TMX Assessment";
