import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/shared/auth-card";
import { getCurrentUser } from "@/lib/session";
import { pathAfterSignIn } from "@/lib/sign-in-redirect";
import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [{ next }, user] = await Promise.all([
    searchParams,
    // If the API can't be reached, show the form anyway; signing in will say what's wrong.
    getCurrentUser().catch(() => null),
  ]);
  const destination = pathAfterSignIn(next);

  // Already signed in, so skip the form. Only the API can tell; a cookie alone isn't proof.
  if (user) redirect(destination);

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to TMX HR with your work email."
      // Accounts are invite-only on the backend, so there's no sign-up page.
      footer="No account? Ask an admin to invite you."
    >
      <LoginForm destination={destination} />
    </AuthCard>
  );
}
