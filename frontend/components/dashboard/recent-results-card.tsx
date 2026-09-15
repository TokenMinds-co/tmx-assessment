import type { RecentResult } from "@/components/dashboard/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatShortDate, initials } from "@/lib/format";

/** The candidates who most recently finished their tests, newest first. */
export function RecentResultsCard({
  results,
  className,
}: {
  results: RecentResult[];
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Recent results</CardTitle>
        <CardDescription>The latest candidates to finish their tests. Scores are out of 100.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="-my-3 divide-y">
          {results.map((result) => (
            <li key={result.id} className="flex items-center gap-3 py-3">
              <Avatar>
                <AvatarFallback className="text-xs font-semibold">
                  {initials(result.candidate)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{result.candidate}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {result.role} · {result.tests} tests
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-foreground tabular-nums">
                  <span className="sr-only">Average score </span>
                  {result.score}
                </p>
                <p className="text-xs text-muted-foreground">
                  <time dateTime={result.finishedAt}>{formatShortDate(result.finishedAt)}</time>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
