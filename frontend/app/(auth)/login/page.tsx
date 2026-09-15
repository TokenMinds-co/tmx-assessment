import type { Metadata } from "next";
import { AuthCard } from "@/components/shared/auth-card";
import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to TMX HR with your work email."
      // Accounts are invite-only on the backend, so there's no sign-up page.
      footer="No account? Ask an admin to invite you."
    >
      <LoginForm />
    </AuthCard>
  );
}
