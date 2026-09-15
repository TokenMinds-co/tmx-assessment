"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/shared/auth-card";
import { NewPasswordFields } from "@/components/shared/new-password-fields";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { newPasswordErrors, type NewPasswordErrors } from "@/lib/validation";

/**
 * Finishes an invitation: the new staff member sets a password and, if they
 * like, corrects their name. UI only for now: the token rides along in a hidden
 * field, and a valid form goes to the dashboard, as the backend signs the new
 * user straight in.
 */
export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<NewPasswordErrors>({});

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = newPasswordErrors(new FormData(event.currentTarget));
    setErrors(next);
    if (!next.password && !next.confirm) router.push("/");
  }

  return (
    <AuthCard
      title="Set up your account"
      description="You’ve been invited to TMX HR. Choose a password to finish setting up your account."
    >
      <form onSubmit={handleSubmit} noValidate>
        <input type="hidden" name="token" value={token} />
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="name">
              Your name <span className="font-normal text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Input id="name" name="name" autoComplete="name" aria-describedby="name-hint" />
            <FieldDescription id="name-hint">
              Leave it blank to keep the name on your invitation.
            </FieldDescription>
          </Field>
          <NewPasswordFields label="Password" errors={errors} />
          <Button type="submit" className="mt-1 w-full">
            Create account
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
