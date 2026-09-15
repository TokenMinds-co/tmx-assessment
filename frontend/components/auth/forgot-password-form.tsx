"use client";

import Link from "next/link";
import { useState } from "react";
import { MailCheckIcon } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { emailError } from "@/components/auth/validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/**
 * Asks for an email, then confirms a reset link is on its way. UI only for
 * now: nothing is sent. The confirmation reads the same whether or not the
 * account exists, so the page never reveals who has one.
 */
export function ForgotPasswordForm() {
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    const problem = emailError(email);
    setError(problem);
    if (!problem) setSentTo(email);
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
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@tokenminds.co"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "email-error" : undefined}
            />
            <FieldError id="email-error">{error}</FieldError>
          </Field>
          <Button type="submit" className="mt-1 w-full">
            Send reset link
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
