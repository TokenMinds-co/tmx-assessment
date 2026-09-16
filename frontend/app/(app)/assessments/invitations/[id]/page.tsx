import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { InvitationResults } from "./_components/invitation-results";

export const metadata: Metadata = { title: "Results" };

export default async function InvitationPage({ params }: PageProps<"/assessments/invitations/[id]">) {
  const [{ id }] = await Promise.all([params, requireUser()]);
  return <InvitationResults id={id} />;
}
