import { InvalidLink } from "@/components/shared/invalid-link";

/** A reset link with no token, or one the API turned down as unknown, used or expired. */
export function InvalidResetLink() {
  return (
    <InvalidLink
      title="This reset link doesn’t work"
      action={{ href: "/forgot-password", label: "Request a new link" }}
    >
      It may have expired or already been used. Ask for a new one, then open the most recent
      email.
    </InvalidLink>
  );
}
