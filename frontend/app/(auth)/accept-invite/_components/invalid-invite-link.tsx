import { InvalidLink } from "@/components/shared/invalid-link";

/** An invitation link with no token, or one the API turned down as unknown, used or expired. */
export function InvalidInviteLink() {
  return (
    <InvalidLink title="This invitation link doesn’t work">
      It may have expired or already been used. Ask an admin to send you a new invitation.
    </InvalidLink>
  );
}
