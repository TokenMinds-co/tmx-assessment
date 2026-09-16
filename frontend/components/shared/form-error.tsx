import { CircleAlertIcon } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";

/**
 * A failure that belongs to the whole form rather than one field, such as a
 * wrong password, a rate limit or a lost connection. It sits above the fields
 * and renders nothing without a message.
 */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>{message}</AlertTitle>
    </Alert>
  );
}
