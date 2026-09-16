import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * The full-width submit button of a sign-in form. While the request runs it
 * shows a spinner and `pendingLabel`, and it's disabled, so the form can't be
 * sent twice.
 */
export function SubmitButton({
  pending,
  pendingLabel,
  children,
}: {
  pending: boolean;
  pendingLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Button type="submit" disabled={pending} className="mt-1 w-full">
      {pending ? <Spinner data-icon="inline-start" /> : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}
