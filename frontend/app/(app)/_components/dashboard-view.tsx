"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon, SendIcon } from "lucide-react";
import Link from "next/link";
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import { getDashboard } from "@/lib/api/dashboard";
import { dashboardKeys } from "@/lib/query-keys";
import { AssessmentCard } from "./assessment-card";
import { RecentResultsCard } from "./recent-results-card";

/** Both cards share this grid, so the skeleton lands where the real cards will. */
const GRID = "grid gap-6 xl:grid-cols-5";

/**
 * The dashboard's numbers, from one call. `staleTime: 0` because candidates
 * move these counts on their own, at any moment, and no staff action in this
 * app changes them: there's nothing to invalidate the query from.
 */
export function DashboardView() {
  const dashboard = useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: getDashboard,
    staleTime: 0,
  });

  if (dashboard.isPending) return <DashboardSkeleton />;
  if (dashboard.isError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>{errorMessage(dashboard.error)}</AlertTitle>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={() => void dashboard.refetch()}>
            Try again
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  const { progress, expiredInvitations, tests, recentResults } = dashboard.data;
  const links = progress.notStarted + progress.inProgress + progress.completed + expiredInvitations;

  // A new workspace has nothing to plot. Say so on purpose, rather than
  // showing empty bars that read as a broken page.
  if (links === 0) {
    return (
      <Empty className="border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SendIcon />
          </EmptyMedia>
          <EmptyTitle>No tests sent yet</EmptyTitle>
          <EmptyDescription>
            Send a test to a candidate, and their progress and scores appear here.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/assessments">Go to assessments</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className={GRID}>
      <AssessmentCard
        progress={progress}
        expiredInvitations={expiredInvitations}
        tests={tests}
        className="min-w-0 xl:col-span-3"
      />
      <RecentResultsCard results={recentResults} className="min-w-0 xl:col-span-2" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the dashboard" className={GRID}>
      <Card className="min-w-0 xl:col-span-3">
        <CardHeader className="gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="gap-6">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-3 w-full" />
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-3 w-40 max-w-[40%]" />
                <Skeleton className="h-2 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 xl:col-span-2">
        <CardHeader className="gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </CardHeader>
        <CardContent>
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 py-1.5">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3 w-32 max-w-full" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
