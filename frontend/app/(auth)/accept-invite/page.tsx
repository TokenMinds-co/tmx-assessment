import type { Metadata } from "next";
import { AcceptInviteForm } from "./_components/accept-invite-form";
import { InvalidInviteLink } from "./_components/invalid-invite-link";

export const metadata: Metadata = { title: "Set up your account" };

/** Opened from the invitation email as /accept-invite?token=… */
export default async function AcceptInvitePage({ searchParams }: PageProps<"/accept-invite">) {
  const { token } = await searchParams;

  if (typeof token !== "string" || !token) return <InvalidInviteLink />;

  return <AcceptInviteForm token={token} />;
}
