const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password length is the backend's only password rule
 * (backend/docs/authentication.md). Keep these two in step with it.
 */
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

export interface NewPasswordErrors {
  password?: string;
  confirm?: string;
}

/** The message to show under an email field, or undefined when the value looks fine. */
export function emailError(value: string): string | undefined {
  const email = value.trim();
  if (!email) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(email)) return "Enter a full email address, like name@example.com.";
  return undefined;
}

/** Checks the `password` and `confirm` fields of a form that sets a new password. */
export function newPasswordErrors(data: FormData): NewPasswordErrors {
  const password = String(data.get("password") ?? "");
  const confirm = String(data.get("confirm") ?? "");

  let passwordError: string | undefined;
  if (password.length < MIN_PASSWORD_LENGTH) {
    passwordError = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (password.length > MAX_PASSWORD_LENGTH) {
    passwordError = `Use ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  }

  return {
    password: passwordError,
    confirm: confirm === password ? undefined : "The two passwords don’t match.",
  };
}
