import { PasswordInput } from "@/components/shared/password-input";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { MIN_PASSWORD_LENGTH, type NewPasswordErrors } from "@/lib/validation";

/**
 * The password and confirmation fields of a form that sets a new password.
 * They're named `password` and `confirm`, which is what `newPasswordErrors` reads.
 */
export function NewPasswordFields({
  label,
  errors,
}: {
  label: string;
  errors: NewPasswordErrors;
}) {
  return (
    <>
      <Field data-invalid={errors.password ? true : undefined}>
        <FieldLabel htmlFor="password">{label}</FieldLabel>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "password-error" : "password-hint"}
        />
        {errors.password ? (
          <FieldError id="password-error">{errors.password}</FieldError>
        ) : (
          <FieldDescription id="password-hint">
            At least {MIN_PASSWORD_LENGTH} characters.
          </FieldDescription>
        )}
      </Field>

      <Field data-invalid={errors.confirm ? true : undefined}>
        <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          aria-invalid={errors.confirm ? true : undefined}
          aria-describedby={errors.confirm ? "confirm-error" : undefined}
        />
        <FieldError id="confirm-error">{errors.confirm}</FieldError>
      </Field>
    </>
  );
}
