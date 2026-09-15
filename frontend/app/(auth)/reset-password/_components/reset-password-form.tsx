"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCard } from "@/components/shared/auth-card";
import { NewPasswordFields } from "@/components/shared/new-password-fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { newPasswordErrors, type NewPasswordErrors } from "@/lib/validation";

/**
 * Sets a new password from an emailed reset link. UI only for now: the token
 * rides along in a hidden field for the auth work to send, and a valid form
 * just shows the success state.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const [errors, setErrors] = useState<NewPasswordErrors>({});
  const [done, setDone] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = newPasswordErrors(new FormData(event.currentTarget));
    setErrors(next);
    if (!next.password && !next.confirm) setDone(true);
  }

  if (done) {
    return (
      <AuthCard
        title="Password updated"
        description="Sign in with your new password. Any other sessions have been signed out."
      >
        <Button asChild className="w-full">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Choose a new password"
      description="Pick one you don’t use for anything else."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <input type="hidden" name="token" value={token} />
        <FieldGroup className="gap-5">
          <NewPasswordFields label="New password" errors={errors} />
          <Button type="submit" className="mt-1 w-full">
            Reset password
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
