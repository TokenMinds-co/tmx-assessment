"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { MailCheckIcon } from "lucide-react";
import { AuthCard } from "@/components/shared/auth-card";
import { FormError } from "@/components/shared/form-error";
import { SubmitButton } from "@/components/shared/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";
import { emailError } from "@/lib/validation";

interface ForgotPasswordErrors {
  email?: string;
  /** The API's answer, such as a rate limit. */
  form?: string;
}

/**
 * Asks the API to email a reset link, then says it's on its way. The
 * confirmation reads the same whether or not the account exists, as the API
 * answers the same either way, so the page never reveals who has one.
 */
export function ForgotPasswordForm() {
  const [errors, setErrors] = useState<ForgotPasswordErrors>({});
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    const problem = emailError(email);
    setErrors({ email: problem });
    if (problem) return;

    startTransition(async () => {
      try {
        await requestPasswordReset(email);
        setSentTo(email);
      } catch (error) {
        setErrors({ form: errorMessage(error) });
      }
    });
  }

  if (sentTo) {
    return (
      <AuthCard
        title="Check your inbox"
        description="Follow the link in the email to choose a new password."
      >
        <div className="flex flex-col gap-6">
          <Alert variant="success">
            <MailCheckIcon />
            <AlertTitle>Reset link sent</AlertTitle>
            <AlertDescription>
              If there’s an account for <span className="font-medium">{sentTo}</span>, we’ve
              emailed it a link to reset the password.
            </AlertDescription>
          </Alert>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your work email and we’ll send you a link to choose a new password."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup className="gap-5">
          <FormError message={errors.form} />
          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@tokenminds.co"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            <FieldError id="email-error">{errors.email}</FieldError>
          </Field>
          <SubmitButton pending={pending} pendingLabel="Sending link…">
            Send reset link
          </SubmitButton>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
