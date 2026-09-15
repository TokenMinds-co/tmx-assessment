import type { Metadata } from "next";
import { InvalidLink } from "@/components/shared/invalid-link";
import { AcceptInviteForm } from "./_components/accept-invite-form";

export const metadata: Metadata = { title: "Set up your account" };

/** Opened from the invitation email as /accept-invite?token=… */
export default async function AcceptInvitePage({ searchParams }: PageProps<"/accept-invite">) {
  const { token } = await searchParams;

  if (typeof token !== "string" || !token) {
    return (
      <InvalidLink title="This invitation link doesn’t work">
        It may have expired or already been used. Ask an admin to send you a new invitation.
      </InvalidLink>
    );
  }

  return <AcceptInviteForm token={token} />;
}
