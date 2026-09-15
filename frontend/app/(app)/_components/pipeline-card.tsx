import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import type { Pipeline } from "@/lib/dashboard-types";
import { initials, percentOf } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Lines the first and last columns up with the card's 24px padding. */
const EDGE_ALIGNED_TABLE =
  "[&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_th:first-child]:pl-6 [&_th:last-child]:pr-6";

/**
 * Where every active candidate is. One cell per stage, in pipeline order, with
 * its count, share and owner, then the same counts per open role. The table is
 * also the text version of the bars.
 */
export function PipelineCard({ pipeline }: { pipeline: Pipeline }) {
  const { stages, roles } = pipeline;
  const stageTotals = stages.map((stage) =>
    roles.reduce((sum, role) => sum + (role.candidatesByStage[stage.id] ?? 0), 0),
  );
  const total = stageTotals.reduce((sum, count) => sum + count, 0);
  // Every bar shares one scale, the largest stage, so lengths compare across cells.
  const largest = Math.max(1, ...stageTotals);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline</CardTitle>
        <CardDescription>
          {total} candidates across {roles.length} open roles, and who owns each stage.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-2 px-0">
        <ol
          aria-label="Candidates in each stage"
          // `relative` keeps the cells' screen-reader-only text inside this
          // scroller. Without it that text escaped and widened the page on phones.
          className="relative grid auto-cols-[minmax(9rem,1fr)] grid-flow-col overflow-x-auto border-y"
        >
          {stages.map((stage, index) => {
            const count = stageTotals[index];
            return (
              <li
                key={stage.id}
                className="flex min-w-0 flex-col gap-2.5 px-6 py-4 not-first:border-l"
              >
                <span className="truncate text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {stage.name}
                </span>
                <span className="flex items-baseline gap-1.5">
                  <span className="text-xl leading-none font-bold text-foreground">{count}</span>
                  <span className="text-xs text-muted-foreground">{percentOf(count, total)}%</span>
                </span>
                <span
                  aria-hidden="true"
                  className="h-2 rounded-r-[4px] bg-chart-1"
                  style={{ width: `${(count / largest) * 100}%` }}
                />
                <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <Avatar size="sm">
                    <AvatarFallback>{initials(stage.owner)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">
                    <span className="sr-only">Owner: </span>
                    {stage.owner}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>

        <Table className={EDGE_ALIGNED_TABLE}>
          <TableCaption className="sr-only">Candidates in each stage, by open role</TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Role</TableHead>
              {stages.map((stage) => (
                <TableHead key={stage.id} className="text-right">
                  {stage.name}
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => {
              const roleTotal = stages.reduce(
                (sum, stage) => sum + (role.candidatesByStage[stage.id] ?? 0),
                0,
              );
              return (
                <TableRow key={role.id}>
                  <TableCell className="font-medium text-foreground">{role.title}</TableCell>
                  {stages.map((stage) => {
                    const count = role.candidatesByStage[stage.id] ?? 0;
                    return (
                      <TableCell
                        key={stage.id}
                        className={cn("text-right tabular-nums", count === 0 && "text-muted-foreground")}
                      >
                        {count}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right font-semibold tabular-nums">{roleTotal}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
