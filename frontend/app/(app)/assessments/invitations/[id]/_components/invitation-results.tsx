"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, BanIcon, FileQuestionIcon, MailIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ResendInvitationDialog } from "@/components/shared/resend-invitation-dialog";
import { InvitationStatusBadge } from "@/components/shared/status-badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, errorMessage } from "@/lib/api/client";
import { getInvitation, revokeInvitation } from "@/lib/api/invitations";
import { formatDateTime, formatLongDate } from "@/lib/format";
import { invitationKeys } from "@/lib/query-keys";
import { AttemptCard } from "./attempt-card";

/** One candidate's link: who sent it, and each test's result. */
export function InvitationResults({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: invitationKeys.detail(id),
    queryFn: () => getInvitation(id),
    // While a test is running, check back now and then for the score.
    refetchInterval: (current) => (current.state.data?.status === "IN_PROGRESS" ? 15_000 : false),
  });
  const [resending, setResending] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const revoke = useMutation({
    mutationFn: () => revokeInvitation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invitationKeys.all });
      setConfirmRevoke(false);
      toast.success("Link revoked. It stops working straight away.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (query.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-6 p-4 md:p-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.isError) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return (
      <div className="p-4 md:p-6">
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileQuestionIcon />
            </EmptyMedia>
            <EmptyTitle>{missing ? "This link doesn’t exist" : "We couldn’t load the results"}</EmptyTitle>
            <EmptyDescription>{errorMessage(query.error)}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" asChild>
              <Link href="/assessments?tab=sent">Back to sent tests</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const invitation = query.data;
  const open = invitation.status !== "REVOKED" && invitation.status !== "COMPLETED";

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <Link
        href="/assessments?tab=sent"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Sent tests
      </Link>

      <PageHeader title={invitation.candidate.name} description={invitation.candidate.email}>
        <InvitationStatusBadge status={invitation.status} />
        {open ? (
          <>
            <Button variant="outline" onClick={() => setResending(true)}>
              <MailIcon data-icon="inline-start" />
              Resend link
            </Button>
            <Button variant="destructive" onClick={() => setConfirmRevoke(true)}>
              <BanIcon data-icon="inline-start" />
              Revoke
            </Button>
          </>
        ) : null}
      </PageHeader>

      <dl className="grid gap-4 rounded-xl border bg-card p-4 text-sm shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="Sent by">{invitation.sentBy?.name ?? "Unknown"}</Detail>
        <Detail label="Sent">{formatDateTime(invitation.createdAt)}</Detail>
        <Detail label="Last opened">
          {invitation.lastOpenedAt ? formatDateTime(invitation.lastOpenedAt) : "Not opened yet"}
        </Detail>
        <Detail label={invitation.status === "REVOKED" ? "Revoked" : "Link works until"}>
          {invitation.revokedAt ? formatDateTime(invitation.revokedAt) : formatLongDate(invitation.expiresAt)}
        </Detail>
      </dl>

      {invitation.sentAt === null && invitation.status !== "REVOKED" ? (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>The email didn’t go out</AlertTitle>
          <AlertDescription>Resend the link to try again, or copy the new link and share it yourself.</AlertDescription>
        </Alert>
      ) : null}

      {invitation.message ? (
        <section className="flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">Note to the candidate</h2>
          <p className="max-w-[70ch] text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
            {invitation.message}
          </p>
        </section>
      ) : null}

      <div className="flex flex-col gap-6">
        {invitation.attempts.map((attempt) => (
          <AttemptCard key={attempt.id} attempt={attempt} />
        ))}
      </div>

      <ResendInvitationDialog invitation={resending ? invitation : null} onOpenChange={setResending} />

      <AlertDialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke {invitation.candidate.name}’s link?</AlertDialogTitle>
            <AlertDialogDescription>
              It stops working straight away, even in the middle of a test. Finished tests keep their scores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={revoke.isPending}
              onClick={(event) => {
                event.preventDefault();
                revoke.mutate();
              }}
            >
              Revoke link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}
