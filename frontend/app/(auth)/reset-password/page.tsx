import type { Metadata } from "next";
import { InvalidLink } from "@/components/auth/invalid-link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

/** Opened from the reset email as /reset-password?token=… */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;

  if (typeof token !== "string" || !token) {
    return (
      <InvalidLink
        title="This reset link doesn’t work"
        action={{ href: "/forgot-password", label: "Request a new link" }}
      >
        It may have expired or already been used. Ask for a new one, then open the most recent
        email.
      </InvalidLink>
    );
  }

  return <ResetPasswordForm token={token} />;
}
