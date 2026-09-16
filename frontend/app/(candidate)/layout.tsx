import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Your assessment · TokenMinds" },
  // The candidate's access token is in the address. Never send it to another site.
  referrer: "no-referrer",
};

/**
 * Candidate pages: no navigation, nothing to distract. Each page draws its own
 * header, since the test runner needs the whole screen (docs/routing.md). The
 * layout is the page's one main landmark, so pages inside it don't add another.
 */
export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-dvh bg-background">{children}</main>;
}
