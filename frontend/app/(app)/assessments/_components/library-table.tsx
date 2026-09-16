"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CircleAlertIcon,
  ClipboardListIcon,
  CopyPlusIcon,
  DownloadIcon,
  EllipsisIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AssessmentStatusBadge } from "@/components/shared/status-badges";
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type AssessmentStatus,
  type AssessmentSummary,
  deleteAssessment,
  duplicateAssessment,
  exportJsonUrl,
  listAssessments,
  updateAssessment,
} from "@/lib/api/assessments";
import { errorMessage } from "@/lib/api/client";
import { formatPercent, plural } from "@/lib/format";
import { assessmentKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

/** Columns that give way on phones, so the name and status stay in view. */
const WIDE_ONLY = "hidden md:table-cell";

/** Every test, with how often it was sent and how it scores. */
export function LibraryTable({
  isAdmin,
  onSend,
  onCreate,
}: {
  isAdmin: boolean;
  onSend: (id: string) => void;
  onCreate: () => void;
}) {
  const list = useQuery({ queryKey: assessmentKeys.list(), queryFn: () => listAssessments() });
  const [showArchived, setShowArchived] = useState(false);

  if (list.isPending) return <TableSkeleton />;
  if (list.isError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>{errorMessage(list.error)}</AlertTitle>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={() => void list.refetch()}>
            Try again
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  if (list.data.length === 0) {
    return (
      <Empty className="border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardListIcon />
          </EmptyMedia>
          <EmptyTitle>No tests yet</EmptyTitle>
          <EmptyDescription>
            {isAdmin
              ? "Create a test, or import one from a JSON file."
              : "An admin adds tests here. Ask one to set them up."}
          </EmptyDescription>
        </EmptyHeader>
        {isAdmin ? (
          <EmptyContent>
            <Button onClick={onCreate}>
              <PlusIcon data-icon="inline-start" />
              New test
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  const archivedCount = list.data.filter((a) => a.status === "ARCHIVED").length;
  const rows = showArchived ? list.data : list.data.filter((a) => a.status !== "ARCHIVED");

  return (
    <Card className="gap-0 py-0">
      <Table>
        <TableCaption className="sr-only">
          Each test with its status, size, time limit, how often it was sent and its average score
        </TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">Test</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className={cn("text-right", WIDE_ONLY)}>Questions</TableHead>
            <TableHead className={cn("text-right", WIDE_ONLY)}>Time</TableHead>
            <TableHead className={cn("text-right", WIDE_ONLY)}>Sent</TableHead>
            <TableHead className={cn("text-right", WIDE_ONLY)}>Average</TableHead>
            <TableHead className="w-12 pr-5">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((assessment) => (
            <LibraryRow key={assessment.id} assessment={assessment} isAdmin={isAdmin} onSend={onSend} />
          ))}
        </TableBody>
      </Table>
      {archivedCount > 0 ? (
        <div className="border-t px-3 py-2">
          <Button variant="ghost" size="sm" onClick={() => setShowArchived((show) => !show)}>
            {showArchived ? "Hide archived tests" : `Show archived tests (${archivedCount})`}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

function LibraryRow({
  assessment,
  isAdmin,
  onSend,
}: {
  assessment: AssessmentSummary;
  isAdmin: boolean;
  onSend: (id: string) => void;
}) {
  const router = useRouter();
  const href = `/assessments/${assessment.id}`;

  return (
    <TableRow className="cursor-pointer" onClick={() => router.push(href)}>
      <TableCell className="pl-5 whitespace-normal">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            href={href}
            onClick={(event) => event.stopPropagation()}
            className="w-fit font-semibold text-foreground hover:underline"
          >
            {assessment.name}
          </Link>
          <span className="line-clamp-1 text-xs text-muted-foreground">
            {assessment.scoringMethod === "ALIGNMENT" ? "Preferences questionnaire" : "Skills test"}
            {assessment.tagline ? ` · ${assessment.tagline}` : ""}
          </span>
          {assessment.missingMediaCount > 0 ? (
            <span className="flex items-center gap-1 text-xs font-medium text-warning">
              <TriangleAlertIcon aria-hidden="true" className="size-3.5" />
              {plural(assessment.missingMediaCount, "question")} waiting for audio
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <AssessmentStatusBadge status={assessment.status} />
      </TableCell>
      <TableCell className={cn("text-right tabular-nums", WIDE_ONLY)}>{assessment.questionCount}</TableCell>
      <TableCell className={cn("text-right text-muted-foreground tabular-nums", WIDE_ONLY)}>
        {assessment.durationMinutes} min
      </TableCell>
      <TableCell className={cn("text-right tabular-nums", WIDE_ONLY)}>
        {assessment.sentCount}
        <span className="text-muted-foreground"> · {assessment.completedCount} done</span>
      </TableCell>
      <TableCell className={cn("text-right font-semibold tabular-nums", WIDE_ONLY)}>
        {formatPercent(assessment.averageScore)}
      </TableCell>
      <TableCell className="pr-5 text-right" onClick={(event) => event.stopPropagation()}>
        <LibraryActions assessment={assessment} isAdmin={isAdmin} onSend={onSend} />
      </TableCell>
    </TableRow>
  );
}

function LibraryActions({
  assessment,
  isAdmin,
  onSend,
}: {
  assessment: AssessmentSummary;
  isAdmin: boolean;
  onSend: (id: string) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const refreshAll = () => queryClient.invalidateQueries({ queryKey: assessmentKeys.all });

  const duplicate = useMutation({
    mutationFn: () => duplicateAssessment(assessment.id),
    onSuccess: (copy) => {
      queryClient.setQueryData(assessmentKeys.detail(copy.id), copy);
      void refreshAll();
      toast.success(`Copied as “${copy.name}”`);
      router.push(`/assessments/${copy.id}`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const setStatus = useMutation({
    mutationFn: (status: AssessmentStatus) => updateAssessment(assessment.id, { status }),
    onSuccess: (detail) => {
      queryClient.setQueryData(assessmentKeys.detail(detail.id), detail);
      void refreshAll();
      toast.success(detail.status === "ARCHIVED" ? "Archived" : "Restored as a draft");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: () => deleteAssessment(assessment.id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: assessmentKeys.detail(assessment.id) });
      void refreshAll();
      setConfirmDelete(false);
      toast.success("Test deleted");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const sendable = assessment.status === "PUBLISHED" && assessment.missingMediaCount === 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${assessment.name}`}>
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href={`/assessments/${assessment.id}`}>
                <PencilIcon />
                {isAdmin ? "Edit" : "Open"}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`/preview/${assessment.id}`} target="_blank" rel="noreferrer">
                <EyeIcon />
                Preview
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!sendable} onSelect={() => onSend(assessment.id)}>
              <SendIcon />
              Send
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {isAdmin ? (
              <DropdownMenuItem disabled={duplicate.isPending} onSelect={() => duplicate.mutate()}>
                <CopyPlusIcon />
                Duplicate
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem asChild>
              <a href={exportJsonUrl(assessment.id)} download>
                <DownloadIcon />
                Export JSON
              </a>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {isAdmin ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {assessment.status === "ARCHIVED" ? (
                  <DropdownMenuItem onSelect={() => setStatus.mutate("DRAFT")}>
                    <ArchiveRestoreIcon />
                    Restore
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => setStatus.mutate("ARCHIVED")}>
                    <ArchiveIcon />
                    Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  variant="destructive"
                  disabled={assessment.sentCount > 0}
                  onSelect={() => setConfirmDelete(true)}
                >
                  <Trash2Icon />
                  {assessment.sentCount > 0 ? "Delete (sent tests can only be archived)" : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{assessment.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Its questions and settings are deleted too. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                remove.mutate();
              }}
            >
              Delete test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TableSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Loading tests" className="gap-0 py-0">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex items-center gap-4 border-b px-5 py-4 last:border-0">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </Card>
  );
}
