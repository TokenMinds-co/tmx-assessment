import type { Metadata } from "next";
import { InvalidResetLink } from "./_components/invalid-reset-link";
import { ResetPasswordForm } from "./_components/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

/** Opened from the reset email as /reset-password?token=… */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;

  if (typeof token !== "string" || !token) return <InvalidResetLink />;

  return <ResetPasswordForm token={token} />;
}
