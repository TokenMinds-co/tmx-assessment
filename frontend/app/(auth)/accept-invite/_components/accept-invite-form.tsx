"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AuthCard } from "@/components/shared/auth-card";
import { FormError } from "@/components/shared/form-error";
import { NewPasswordFields } from "@/components/shared/new-password-fields";
import { SubmitButton } from "@/components/shared/submit-button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { acceptInvitation, isInvalidLinkError } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";
import { newPasswordErrors, type NewPasswordErrors } from "@/lib/validation";
import { InvalidInviteLink } from "./invalid-invite-link";

interface AcceptInviteErrors extends NewPasswordErrors {
  /** The API's answer, such as a rate limit. */
  form?: string;
}

/**
 * Finishes an invitation: the new staff member sets a password and, if they
 * like, corrects their name. The API signs them straight in, so a valid form
 * goes to the dashboard.
 */
export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<AcceptInviteErrors>({});
  const [linkRejected, setLinkRejected] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const data = new FormData(event.currentTarget);
    const fieldErrors = newPasswordErrors(data);
    setErrors(fieldErrors);
    if (fieldErrors.password || fieldErrors.confirm) return;

    const password = String(data.get("password"));
    // Left blank, the name on the invitation stays.
    const name = String(data.get("name") ?? "").trim() || undefined;
    startTransition(async () => {
      try {
        await acceptInvitation(token, password, name);
      } catch (error) {
        if (isInvalidLinkError(error)) setLinkRejected(true);
        else setErrors({ form: errorMessage(error) });
        return;
      }
      // A transition too, so the button stays busy until the dashboard has loaded.
      startTransition(() => router.replace("/"));
    });
  }

  if (linkRejected) return <InvalidInviteLink />;

  return (
    <AuthCard
      title="Set up your account"
      description="You’ve been invited to TMX Assessment. Choose a password to finish setting up your account."
    >
      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup className="gap-5">
          <FormError message={errors.form} />
          <Field>
            <FieldLabel htmlFor="name">
              Your name <span className="font-normal text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              maxLength={100}
              aria-describedby="name-hint"
            />
            <FieldDescription id="name-hint">
              Leave it blank to keep the name on your invitation.
            </FieldDescription>
          </Field>
          <NewPasswordFields label="Password" errors={errors} />
          <SubmitButton pending={pending} pendingLabel="Creating account…">
            Create account
          </SubmitButton>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
