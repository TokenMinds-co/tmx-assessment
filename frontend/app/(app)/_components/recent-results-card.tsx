import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardResult } from "@/lib/api/dashboard";
import { formatPercent, formatShortDate, initials, plural } from "@/lib/format";

/** "2 tests" once they're all done, "1 of 3 tests" while some are left. */
function testsLine({ testsFinished, testsTotal }: DashboardResult): string {
  return testsFinished >= testsTotal
    ? plural(testsTotal, "test")
    : `${testsFinished} of ${plural(testsTotal, "test")}`;
}

/**
 * The candidates who most recently finished a test, newest first. Each row is
 * a link to that send's results page; its focus outline comes from the rule
 * for links in [app/globals.css](../../../globals.css).
 */
export function RecentResultsCard({
  results,
  className,
}: {
  results: DashboardResult[];
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Recent results</CardTitle>
        <CardDescription>The latest candidates to finish their tests.</CardDescription>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No one has finished a test yet. Results appear here as candidates hand them in.
          </p>
        ) : (
          <ul className="-my-3 divide-y">
            {results.map((result) => (
              <li key={result.invitationId}>
                <Link
                  href={`/assessments/invitations/${result.invitationId}`}
                  className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent/60 focus-visible:bg-accent/60"
                >
                  <Avatar>
                    <AvatarFallback className="text-xs font-semibold">
                      {initials(result.candidate.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {result.candidate.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{testsLine(result)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      <span className="sr-only">Average score </span>
                      {formatPercent(result.averageScore)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <time dateTime={result.finishedAt}>{formatShortDate(result.finishedAt)}</time>
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
