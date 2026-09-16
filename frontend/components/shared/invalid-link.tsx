import Link from "next/link";
import { TriangleAlertIcon } from "lucide-react";
import { AuthCard } from "@/components/shared/auth-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * For an emailed link (a password reset or an invitation) that arrives without
 * a token, or that the API turns down as unknown, used or expired.
 */
export function InvalidLink({
  title,
  action,
  children,
}: {
  title: string;
  /** The way forward, when there is one the user can take themselves. */
  action?: { href: string; label: string };
  /** What went wrong and what to do about it. */
  children: React.ReactNode;
}) {
  return (
    <AuthCard
      title={title}
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="flex flex-col gap-6">
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>We couldn’t use this link</AlertTitle>
          <AlertDescription>{children}</AlertDescription>
        </Alert>
        {action ? (
          <Button asChild className="w-full">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : null}
      </div>
    </AuthCard>
  );
}
