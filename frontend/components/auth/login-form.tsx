"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordInput } from "@/components/auth/password-input";
import { emailError } from "@/components/auth/validation";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface LoginErrors {
  email?: string;
  password?: string;
}

/**
 * Email and password sign-in. UI only for now: nothing is sent anywhere, and a
 * filled-in form goes straight to the dashboard. The auth work replaces
 * `handleSubmit` (docs/authentication.md).
 */
export function LoginForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<LoginErrors>({});

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: LoginErrors = {
      email: emailError(String(data.get("email") ?? "")),
      password: data.get("password") ? undefined : "Enter your password.",
    };
    setErrors(next);
    if (!next.email && !next.password) router.push("/");
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup className="gap-5">
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

        <Button type="submit" className="mt-1 w-full">
          Sign in
        </Button>
      </FieldGroup>
    </form>
  );
}
