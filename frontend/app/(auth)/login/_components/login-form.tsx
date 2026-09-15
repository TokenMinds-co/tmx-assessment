"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/shared/form-error";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";
import { emailError } from "@/lib/validation";

interface LoginErrors {
  email?: string;
  password?: string;
  /** The API's answer, such as a wrong password or a rate limit. */
  form?: string;
}

/**
 * Email and password sign-in. The API sets the session cookie, then the form
 * opens `destination`: the page that sent the user here, or the dashboard.
 */
export function LoginForm({ destination }: { destination: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<LoginErrors>({});
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const fieldErrors: LoginErrors = {
      email: emailError(email),
      password: password ? undefined : "Enter your password.",
    };
    setErrors(fieldErrors);
    if (fieldErrors.email || fieldErrors.password) return;

    startTransition(async () => {
      try {
        await signIn(email, password);
      } catch (error) {
        setErrors({ form: errorMessage(error) });
        return;
      }
      // A transition too, so the button stays busy until the next page has loaded.
      startTransition(() => router.replace(destination));
    });
  }

  return (
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

        <Field data-invalid={errors.password ? true : undefined}>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          <FieldError id="password-error">{errors.password}</FieldError>
        </Field>

        <SubmitButton pending={pending} pendingLabel="Signing in…">
          Sign in
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
