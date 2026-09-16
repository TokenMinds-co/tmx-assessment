"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowLeftIcon,
  CircleCheckIcon,
  CopyPlusIcon,
  DownloadIcon,
  EllipsisIcon,
  EyeIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { AssessmentStatusBadge } from "@/components/shared/status-badges";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type AssessmentDetail,
  type AssessmentStatus,
  deleteAssessment,
  duplicateAssessment,
  exportCsvUrl,
  exportJsonUrl,
  updateAssessment,
} from "@/lib/api/assessments";
import { errorMessage } from "@/lib/api/client";
import { formatPercent, plural } from "@/lib/format";
import { assessmentKeys } from "@/lib/query-keys";
import { useAssessmentMutation } from "./use-assessment-mutation";

const STATUS_TOAST: Record<AssessmentStatus, string> = {
  PUBLISHED: "Published. You can send it now.",
  DRAFT: "Moved back to draft",
  ARCHIVED: "Archived",
};
const PROBLEMS_SHOWN = 5;

/** The test's name, its actions, key numbers, and what it needs before it can be sent. */
export function EditorHeader({
  assessment,
  isAdmin,
  onSend,
}: {
  assessment: AssessmentDetail;
  isAdmin: boolean;
  onSend: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const setStatus = useAssessmentMutation(assessment.id, (status: AssessmentStatus) =>
    updateAssessment(assessment.id, { status }),
  );
  const changeStatus = (status: AssessmentStatus) =>
    setStatus.mutate(status, { onSuccess: () => toast.success(STATUS_TOAST[status]) });

  const duplicate = useMutation({
    mutationFn: () => duplicateAssessment(assessment.id),
    onSuccess: (copy) => {
      queryClient.setQueryData(assessmentKeys.detail(copy.id), copy);
      void queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
      toast.success(`Copied as “${copy.name}”`);
      router.push(`/assessments/${copy.id}`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: () => deleteAssessment(assessment.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
      toast.success("Test deleted");
      router.replace("/assessments");
      queryClient.removeQueries({ queryKey: assessmentKeys.detail(assessment.id) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const sendable = assessment.status === "PUBLISHED" && assessment.problems.length === 0;
  const archived = assessment.status === "ARCHIVED";

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/assessments"
        className="flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Assessments
      </Link>

      <PageHeader
        title={assessment.name}
        description={
          assessment.tagline ?? (assessment.scoringMethod === "ALIGNMENT" ? "Preferences questionnaire" : "Skills test")
        }
      >
        <AssessmentStatusBadge status={assessment.status} />
        <Button variant="outline" asChild>
          <a href={`/preview/${assessment.id}`} target="_blank" rel="noreferrer">
            <EyeIcon data-icon="inline-start" />
            Preview
          </a>
        </Button>
        <Button onClick={onSend} disabled={!sendable}>
          <SendIcon data-icon="inline-start" />
          Send
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="More actions">
              <EllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
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
              <DropdownMenuItem asChild>
                <a href={exportCsvUrl(assessment.id)} download>
                  <DownloadIcon />
                  Export questions as CSV
                </a>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {isAdmin ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {assessment.status === "PUBLISHED" ? (
                    <DropdownMenuItem onSelect={() => changeStatus("DRAFT")}>
                      <PencilIcon />
                      Move back to draft
                    </DropdownMenuItem>
                  ) : null}
                  {archived ? (
                    <DropdownMenuItem onSelect={() => changeStatus("DRAFT")}>
                      <ArchiveRestoreIcon />
                      Restore
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={() => changeStatus("ARCHIVED")}>
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
      </PageHeader>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border bg-card px-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Questions" value={String(assessment.questionCount)} />
        <Stat label="Sections" value={String(assessment.sectionCount)} />
        <Stat label="Time limit" value={`${assessment.durationMinutes} min`} />
        <Stat label="Scoring" value={assessment.scoringMethod === "ALIGNMENT" ? "Fit to role" : "Right answers"} />
        <Stat label="Sent" value={`${assessment.sentCount} · ${assessment.completedCount} done`} />
        <Stat label="Average" value={formatPercent(assessment.averageScore)} />
      </dl>

      {archived ? (
        <Alert>
          <ArchiveIcon />
          <AlertTitle>Archived, so it can’t be sent.</AlertTitle>
          <AlertDescription>Results from earlier sends stay available.</AlertDescription>
          {isAdmin ? (
            <AlertAction>
              <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => changeStatus("DRAFT")}>
                Restore
              </Button>
            </AlertAction>
          ) : null}
        </Alert>
      ) : assessment.problems.length > 0 ? (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>
            {assessment.status === "PUBLISHED"
              ? "Fix these before you send it again."
              : `${plural(assessment.problems.length, "thing")} to fix before you can publish.`}
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {assessment.problems.slice(0, PROBLEMS_SHOWN).map((problem, index) => (
                <li key={`${index}-${problem}`}>{problem}</li>
              ))}
              {assessment.problems.length > PROBLEMS_SHOWN ? (
                <li>And {assessment.problems.length - PROBLEMS_SHOWN} more.</li>
              ) : null}
            </ul>
          </AlertDescription>
        </Alert>
      ) : assessment.status === "DRAFT" ? (
        <Alert variant="info">
          <CircleCheckIcon />
          <AlertTitle>Ready to publish</AlertTitle>
          <AlertDescription>
            Publish it to send it to candidates. You can keep editing after that; people already sent it keep their
            version.
          </AlertDescription>
          {isAdmin ? (
            <AlertAction>
              <Button size="sm" disabled={setStatus.isPending} onClick={() => changeStatus("PUBLISHED")}>
                Publish
              </Button>
            </AlertAction>
          ) : null}
        </Alert>
      ) : null}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{assessment.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Its questions and settings are deleted too. This can’t be undone.</AlertDialogDescription>
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
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-semibold text-foreground tabular-nums">{value}</dd>
    </div>
  );
}
