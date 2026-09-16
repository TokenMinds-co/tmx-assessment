"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SendIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";
import { type CandidateChoice, type CandidateErrors, CandidatePicker } from "@/components/shared/candidate-picker";
import { CopyLink } from "@/components/shared/copy-link";
import { DoneMark } from "@/components/shared/done-mark";
import { FormError } from "@/components/shared/form-error";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { listAssessments } from "@/lib/api/assessments";
import { errorMessage } from "@/lib/api/client";
import { type SentInvitation, sendInvitation } from "@/lib/api/invitations";
import { plural } from "@/lib/format";
import { assessmentKeys, candidateKeys, invitationKeys } from "@/lib/query-keys";
import { emailError } from "@/lib/validation";
import { cn } from "@/lib/utils";

const EXPIRY_DAYS = ["3", "7", "14", "30"];
/** A candidate's total should stay around 30–40 minutes (docs/assessments.md). */
const COMFORTABLE_MINUTES = 40;

/**
 * Sends one or more tests to a candidate in one email with one link. Opened
 * from the library, the Sent tab and the editor.
 */
export function SendAssessmentDialog({
  open,
  onOpenChange,
  defaultAssessmentIds = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAssessmentIds?: string[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        {open ? (
          <SendForm defaultAssessmentIds={defaultAssessmentIds} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SendForm({ defaultAssessmentIds, onDone }: { defaultAssessmentIds: string[]; onDone: () => void }) {
  const queryClient = useQueryClient();
  const tests = useQuery({
    queryKey: assessmentKeys.list({ status: "PUBLISHED" }),
    queryFn: () => listAssessments("PUBLISHED"),
  });
  const [candidate, setCandidate] = useState<CandidateChoice | null>(null);
  const [selected, setSelected] = useState<string[]>(defaultAssessmentIds);
  const [expiresInDays, setExpiresInDays] = useState("14");
  const [message, setMessage] = useState("");
  const [candidateErrors, setCandidateErrors] = useState<CandidateErrors>({});
  const [testsError, setTestsError] = useState<string>();

  const send = useMutation({
    mutationFn: sendInvitation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invitationKeys.all });
      void queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: candidateKeys.all });
    },
  });

  if (send.data) {
    return (
      <SentView
        sent={send.data}
        onDone={onDone}
        onAnother={() => {
          send.reset();
          setCandidate(null);
          setMessage("");
        }}
      />
    );
  }

  const available = tests.data ?? [];
  const chosen = available.filter((test) => selected.includes(test.id));
  const minutes = chosen.reduce((sum, test) => sum + test.durationMinutes, 0);

  function toggle(id: string, on: boolean) {
    setSelected((current) => (on ? [...current, id] : current.filter((value) => value !== id)));
    setTestsError(undefined);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: CandidateErrors = !candidate
      ? { choice: "Choose a candidate, or add a new one." }
      : candidate.kind === "new"
        ? {
            name: candidate.name.trim() ? undefined : "Enter the candidate’s name.",
            email: emailError(candidate.email),
          }
        : {};
    const nextTestsError = chosen.length === 0 ? "Choose at least one test." : undefined;
    setCandidateErrors(nextErrors);
    setTestsError(nextTestsError);
    if (!candidate || nextErrors.choice || nextErrors.name || nextErrors.email || nextTestsError) return;

    send.mutate({
      ...(candidate.kind === "existing"
        ? { candidateId: candidate.candidate.id }
        : { candidate: { name: candidate.name.trim(), email: candidate.email.trim() } }),
      // In the library's order, so the candidate sees them in a steady order.
      assessmentIds: chosen.map((test) => test.id),
      expiresInDays: Number(expiresInDays),
      message: message.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Send tests</DialogTitle>
        <DialogDescription>The candidate gets one email with a link to every test you choose.</DialogDescription>
      </DialogHeader>

      <FieldGroup className="gap-6">
        <FormError message={send.error ? errorMessage(send.error) : undefined} />

        <CandidatePicker value={candidate} onChange={setCandidate} errors={candidateErrors} />

        <FieldSet data-invalid={testsError ? true : undefined}>
          <FieldLegend variant="label">Tests</FieldLegend>
          {tests.isPending ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : available.length === 0 ? (
            <FieldDescription>No tests are published yet. Publish one in the library first.</FieldDescription>
          ) : (
            <div className="flex flex-col gap-2">
              {available.map((test) => {
                const blocked = test.missingMediaCount > 0;
                return (
                  <FieldLabel key={test.id} htmlFor={`send-${test.id}`}>
                    <Field orientation="horizontal" data-disabled={blocked ? true : undefined}>
                      <Checkbox
                        id={`send-${test.id}`}
                        checked={selected.includes(test.id)}
                        onCheckedChange={(checked) => toggle(test.id, checked === true)}
                        disabled={blocked}
                      />
                      <FieldContent>
                        <FieldTitle>{test.name}</FieldTitle>
                        <FieldDescription>
                          {test.durationMinutes} min · {plural(test.questionCount, "question")}
                          {blocked ? " · waiting for audio" : ""}
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                );
              })}
            </div>
          )}
          <FieldError>{testsError}</FieldError>
          {chosen.length > 0 ? (
            <p className={cn("text-sm", minutes > COMFORTABLE_MINUTES ? "text-warning" : "text-muted-foreground")}>
              {minutes} minutes in total.
              {minutes > COMFORTABLE_MINUTES ? " Candidates should spend about 30 to 40 minutes on tests." : ""}
            </p>
          ) : null}
        </FieldSet>

        <Field>
          <FieldLabel htmlFor="send-expiry">The link works for</FieldLabel>
          <Select value={expiresInDays} onValueChange={setExpiresInDays}>
            <SelectTrigger id="send-expiry" className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {EXPIRY_DAYS.map((days) => (
                  <SelectItem key={days} value={days}>
                    {days} days
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="send-message">
            Note to the candidate <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Textarea
            id="send-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Good luck! Take them whenever suits you this week."
          />
          <FieldDescription>Shown in the email and on their start page.</FieldDescription>
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={send.isPending}>
          {send.isPending ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
          {send.isPending ? "Sending…" : "Send"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function SentView({ sent, onDone, onAnother }: { sent: SentInvitation; onDone: () => void; onAnother: () => void }) {
  const { candidate } = sent.invitation;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        <DoneMark className="size-12" />
        <DialogHeader className="items-center">
          <DialogTitle>Sent to {candidate.name}</DialogTitle>
          <DialogDescription>
            {sent.emailSent
              ? `We emailed the link to ${candidate.email}.`
              : "The tests are saved, but the email didn’t go out."}
          </DialogDescription>
        </DialogHeader>
      </div>
      {sent.emailSent ? null : (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>Share the link yourself</AlertTitle>
          <AlertDescription>Copy it below, or resend it from the Sent tab later.</AlertDescription>
        </Alert>
      )}
      <Field>
        <FieldLabel htmlFor="sent-link">The candidate’s link</FieldLabel>
        <CopyLink id="sent-link" link={sent.link} />
        <FieldDescription>It’s personal to the candidate. Resending makes a new one.</FieldDescription>
      </Field>
      <DialogFooter>
        <Button variant="outline" onClick={onAnother}>
          Send to someone else
        </Button>
        <Button onClick={onDone}>Done</Button>
      </DialogFooter>
    </div>
  );
}
