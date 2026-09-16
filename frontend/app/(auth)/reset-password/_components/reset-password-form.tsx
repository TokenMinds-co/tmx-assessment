"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AuthCard } from "@/components/shared/auth-card";
import { FormError } from "@/components/shared/form-error";
import { NewPasswordFields } from "@/components/shared/new-password-fields";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { isInvalidLinkError, resetPassword } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";
import { newPasswordErrors, type NewPasswordErrors } from "@/lib/validation";
import { InvalidResetLink } from "./invalid-reset-link";

interface ResetPasswordErrors extends NewPasswordErrors {
  /** The API's answer, such as a rate limit. */
  form?: string;
}

/**
 * Sets a new password from an emailed reset link. The API signs out every
 * session, so the next step is signing in with the new password.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const [errors, setErrors] = useState<ResetPasswordErrors>({});
  const [outcome, setOutcome] = useState<"done" | "invalid-link" | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const data = new FormData(event.currentTarget);
    const fieldErrors = newPasswordErrors(data);
    setErrors(fieldErrors);
    if (fieldErrors.password || fieldErrors.confirm) return;

    const password = String(data.get("password"));
    startTransition(async () => {
      try {
        await resetPassword(token, password);
        setOutcome("done");
      } catch (error) {
        if (isInvalidLinkError(error)) setOutcome("invalid-link");
        else setErrors({ form: errorMessage(error) });
      }
    });
  }

  if (outcome === "invalid-link") return <InvalidResetLink />;

  if (outcome === "done") {
    return (
      <AuthCard
        title="Password updated"
        description="Sign in with your new password. Every device that was signed in has been signed out."
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
        <FieldGroup className="gap-5">
          <FormError message={errors.form} />
          <NewPasswordFields label="New password" errors={errors} />
          <SubmitButton pending={pending} pendingLabel="Saving password…">
            Reset password
          </SubmitButton>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
