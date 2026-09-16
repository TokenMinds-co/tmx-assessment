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
import type { AssessmentSummary } from "@/lib/dashboard-types";
import { percentOf } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The progress ramp, light to dark, one step per progress state in order.
 * Full class names so Tailwind can see them. Checked with the dataviz
 * validator's ordinal rules on the card surface (docs/design-system.md#charts).
 */
const PROGRESS_FILLS = ["bg-chart-progress-1", "bg-chart-progress-2", "bg-chart-progress-3"];

function progressFill(index: number): string {
  return PROGRESS_FILLS[Math.min(index, PROGRESS_FILLS.length - 1)];
}

/** Lines the first and last columns up with the card's content edge. */
const EDGE_ALIGNED_TABLE =
  "[&_td:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:first-child]:pl-0 [&_th:last-child]:pr-0";

/** Columns that give way on phones, so the score stays in view. */
const WIDE_ONLY = "hidden sm:table-cell";

/** How far candidates have got with their tests, then how each test is scoring. */
export function AssessmentCard({
  summary,
  className,
}: {
  summary: AssessmentSummary;
  className?: string;
}) {
  const sent = summary.progress.reduce((sum, step) => sum + step.count, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Assessments</CardTitle>
        <CardDescription>How far the {sent} candidates who were sent tests have got.</CardDescription>
      </CardHeader>
      <CardContent className="gap-6">
        <div className="flex flex-col gap-3">
          {/* The legend carries every number, so screen readers skip the bar. */}
          <div aria-hidden="true" className="flex h-3 gap-0.5">
            {summary.progress.map((step, index) =>
              step.count > 0 ? (
                <Tooltip key={step.id}>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        "min-w-1 basis-0 transition-[filter] last:rounded-r-[4px] hover:brightness-110",
                        progressFill(index),
                      )}
                      style={{ flexGrow: step.count }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {step.label}: {step.count} ({percentOf(step.count, sent)}%)
                  </TooltipContent>
                </Tooltip>
              ) : null,
            )}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {summary.progress.map((step, index) => (
              <li key={step.id} className="flex items-center gap-2">
                <span aria-hidden="true" className={cn("size-2.5 rounded-[3px]", progressFill(index))} />
                <span className="text-muted-foreground">{step.label}</span>
                <span className="font-semibold text-foreground">{step.count}</span>
              </li>
            ))}
          </ul>
          {summary.expired > 0 ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-warning">
              <TriangleAlertIcon className="size-3.5 shrink-0" aria-hidden="true" />
              {summary.expired} more {summary.expired === 1 ? "invitation" : "invitations"} expired
              before the candidate started.
            </p>
          ) : null}
        </div>

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
            {summary.tests.map((test) => (
              <TableRow key={test.id}>
                <TableCell className="font-medium text-foreground">{test.name}</TableCell>
                <TableCell className={cn("text-right text-muted-foreground tabular-nums", WIDE_ONLY)}>
                  {test.minutes} min
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
      </CardContent>
    </Card>
  );
}

/** A 0–100 score: the violet fill on a lighter track of the same hue, then the number. */
function ScoreMeter({ score }: { score: number }) {
  return (
    <span className="flex items-center gap-3">
      <span aria-hidden="true" className="h-2 flex-1 rounded-r-[4px] bg-primary/15">
        <span className="block h-full rounded-r-[4px] bg-chart-1" style={{ width: `${score}%` }} />
      </span>
      <span className="w-7 text-right font-semibold text-foreground tabular-nums">{score}</span>
    </span>
  );
}
