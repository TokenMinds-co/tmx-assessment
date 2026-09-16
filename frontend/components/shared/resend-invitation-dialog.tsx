"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MailIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";
import { CopyLink } from "@/components/shared/copy-link";
import { FormError } from "@/components/shared/form-error";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/api/client";
import { type InvitationStatus, resendInvitation } from "@/lib/api/invitations";
import { formatLongDate } from "@/lib/format";
import { invitationKeys } from "@/lib/query-keys";

interface ResendTarget {
  id: string;
  status: InvitationStatus;
  expiresAt: string;
  candidate: { name: string; email: string };
}

/**
 * Emails a candidate a fresh link, and shows it to copy. Only the link's hash
 * is stored, so a new link is the only way to get one to share.
 */
export function ResendInvitationDialog({
  invitation,
  onOpenChange,
}: {
  invitation: ResendTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={invitation !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {invitation ? (
          <ResendForm key={invitation.id} invitation={invitation} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ResendForm({ invitation, onDone }: { invitation: ResendTarget; onDone: () => void }) {
  const queryClient = useQueryClient();
  const expired = invitation.status === "EXPIRED";
  const [days, setDays] = useState(expired ? "14" : "keep");
  const resend = useMutation({
    mutationFn: () => resendInvitation(invitation.id, days === "keep" ? undefined : Number(days)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
  });

  if (resend.data) {
    return (
      <div className="flex flex-col gap-5">
        <DialogHeader>
          <DialogTitle>New link ready</DialogTitle>
          <DialogDescription>
            {resend.data.emailSent
              ? `We emailed it to ${invitation.candidate.email}. The old link no longer works.`
              : "The old link no longer works, but the email didn’t go out."}
          </DialogDescription>
        </DialogHeader>
        {resend.data.emailSent ? null : (
          <Alert variant="warning">
            <TriangleAlertIcon />
            <AlertTitle>Share this link yourself</AlertTitle>
            <AlertDescription>Or try resending later.</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="resent-link">The candidate’s link</FieldLabel>
          <CopyLink id="resent-link" link={resend.data.link} />
        </Field>
        <DialogFooter>
          <Button onClick={onDone}>Done</Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>Send {invitation.candidate.name} a new link?</DialogTitle>
        <DialogDescription>
          We’ll email a new link to {invitation.candidate.email}. The old one stops working; finished
          tests stay finished.
        </DialogDescription>
      </DialogHeader>
      <FormError message={resend.error ? errorMessage(resend.error) : undefined} />
      <Field>
        <FieldLabel htmlFor="resend-expiry">The new link works</FieldLabel>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger id="resend-expiry" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {expired ? null : (
                <SelectItem value="keep">Until {formatLongDate(invitation.expiresAt)}, as before</SelectItem>
              )}
              <SelectItem value="3">For 3 days</SelectItem>
              <SelectItem value="7">For 7 days</SelectItem>
              <SelectItem value="14">For 14 days</SelectItem>
              <SelectItem value="30">For 30 days</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        {expired ? <FieldDescription>The old link had expired, so this one gets a new expiry.</FieldDescription> : null}
      </Field>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={() => resend.mutate()} disabled={resend.isPending}>
          {resend.isPending ? <Spinner data-icon="inline-start" /> : <MailIcon data-icon="inline-start" />}
          Send new link
        </Button>
      </DialogFooter>
    </div>
  );
}
