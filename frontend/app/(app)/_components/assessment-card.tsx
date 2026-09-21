import { TriangleAlertIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DashboardProgress, DashboardTest } from "@/lib/api/dashboard";
import { percentOf, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The three progress states in order, each with its step of the violet ramp,
 * light to dark. Full class names so Tailwind can see them. Checked with the
 * dataviz validator's ordinal rules on the card surface
 * (docs/design-system.md#charts).
 */
const PROGRESS_STEPS = [
  { key: "notStarted", label: "Not started", fill: "bg-chart-progress-1" },
  { key: "inProgress", label: "In progress", fill: "bg-chart-progress-2" },
  { key: "completed", label: "Completed", fill: "bg-chart-progress-3" },
] as const satisfies readonly { key: keyof DashboardProgress; label: string; fill: string }[];

/** Lines the first and last columns up with the card's content edge. */
const EDGE_ALIGNED_TABLE =
  "[&_td:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:first-child]:pl-0 [&_th:last-child]:pr-0";

/** Columns that give way on phones, so the score stays in view. */
const WIDE_ONLY = "hidden sm:table-cell";

/** How far candidates have got with their links, then how each test is scoring. */
export function AssessmentCard({
  progress,
  expiredInvitations,
  tests,
  className,
}: {
  progress: DashboardProgress;
  expiredInvitations: number;
  tests: DashboardTest[];
  className?: string;
}) {
  const live = progress.notStarted + progress.inProgress + progress.completed;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Assessments</CardTitle>
        <CardDescription>
          How far candidates have got with the test links sent to them.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-6">
        <div className="flex flex-col gap-3">
          {/* The legend carries every number, so screen readers skip the bar. */}
          <div aria-hidden="true" className="flex h-3 gap-0.5">
            {live === 0 ? (
              <span className="flex-1 rounded-r-[4px] bg-muted" />
            ) : (
              PROGRESS_STEPS.map((step) => {
                const count = progress[step.key];
                return count > 0 ? (
                  <Tooltip key={step.key}>
                    <TooltipTrigger asChild>
                      <span
                        className={cn(
                          "min-w-1 basis-0 transition-[filter] last:rounded-r-[4px] hover:brightness-110",
                          step.fill,
                        )}
                        style={{ flexGrow: count }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {step.label}: {count} ({percentOf(count, live)}%)
                    </TooltipContent>
                  </Tooltip>
                ) : null;
              })
            )}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {PROGRESS_STEPS.map((step) => (
              <li key={step.key} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn("size-2.5 rounded-[3px]", live === 0 ? "bg-muted" : step.fill)}
                />
                <span className="text-muted-foreground">{step.label}</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {progress[step.key]}
                </span>
              </li>
            ))}
          </ul>
          {expiredInvitations > 0 ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-warning">
              <TriangleAlertIcon className="size-3.5 shrink-0" aria-hidden="true" />
              {plural(expiredInvitations, "link")} expired before the candidate finished.
            </p>
          ) : null}
        </div>

        {tests.length > 0 ? (
          <Table className={EDGE_ALIGNED_TABLE}>
            <TableCaption className="sr-only">
              Time limit, completed attempts and average score out of 100 for each test
            </TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Test</TableHead>
                <TableHead className={cn("text-right", WIDE_ONLY)}>Time</TableHead>
                <TableHead className={cn("text-right", WIDE_ONLY)}>Completed</TableHead>
                <TableHead className="w-2/5 min-w-32">Average score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium text-foreground">{test.name}</TableCell>
                  <TableCell className={cn("text-right text-muted-foreground tabular-nums", WIDE_ONLY)}>
                    {test.durationMinutes} min
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums", WIDE_ONLY)}>
                    {test.completed}
                  </TableCell>
                  <TableCell>
                    <ScoreMeter score={test.averageScore} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * A score out of 100: the violet fill on a lighter track of the same hue, then
 * the number. The API sends 0 to 1, and an em dash stands for no score yet.
 */
function ScoreMeter({ score }: { score: number | null }) {
  const percent = score === null ? null : Math.round(score * 100);

  return (
    <span className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={cn(
          "h-2 flex-1 rounded-r-[4px]",
          percent === null ? "bg-muted" : "bg-primary/15",
        )}
      >
        {percent === null ? null : (
          <span className="block h-full rounded-r-[4px] bg-chart-1" style={{ width: `${percent}%` }} />
        )}
      </span>
      <span
        className={cn(
          "w-7 text-right tabular-nums",
          percent === null ? "text-muted-foreground" : "font-semibold text-foreground",
        )}
      >
        {percent === null ? "—" : percent}
      </span>
    </span>
  );
}
