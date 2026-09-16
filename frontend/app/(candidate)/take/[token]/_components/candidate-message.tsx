import { ClockIcon, Link2OffIcon, TriangleAlertIcon, type LucideIcon } from "lucide-react";
import { CandidateBrand } from "@/components/shared/candidate-brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** A calm card for when the tests can't be shown: a bad link, an expired one, an error. */
export function CandidateMessage({
  icon: Icon = TriangleAlertIcon,
  title,
  children,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-12">
      <CandidateBrand />
      <Card size="lg">
        <CardHeader className="gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-warning-soft text-warning">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription className="text-[15px] leading-relaxed">{children}</CardDescription>
        </CardHeader>
        {action ? <CardContent>{action}</CardContent> : null}
      </Card>
    </div>
  );
}

export function LinkProblem({ expired }: { expired: boolean }) {
  return expired ? (
    <CandidateMessage icon={ClockIcon} title="This link has expired">
      Ask the person who sent it for a new one. Tests you already finished are safe.
    </CandidateMessage>
  ) : (
    <CandidateMessage icon={Link2OffIcon} title="This link doesn’t work">
      It may have been replaced by a newer link, or cancelled. Check your email for the latest one, or
      reply to the person who sent it.
    </CandidateMessage>
  );
}
