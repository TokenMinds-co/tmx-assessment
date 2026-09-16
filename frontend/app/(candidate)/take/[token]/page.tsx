import type { Metadata } from "next";
import { TakeFlow } from "./_components/take-flow";

export const metadata: Metadata = { title: { absolute: "Your assessment · TokenMinds" } };

/**
 * A candidate's link: /take/<token>. There's no sign-in; the API checks the
 * token on every call. Everything happens in the browser from here.
 */
export default async function TakePage({ params }: PageProps<"/take/[token]">) {
  const { token } = await params;
  return <TakeFlow token={token} />;
}
