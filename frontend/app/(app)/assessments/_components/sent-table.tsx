"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BanIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  EllipsisIcon,
  EyeIcon,
  MailIcon,
  SearchIcon,
  SendIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ResendInvitationDialog } from "@/components/shared/resend-invitation-dialog";
import { InvitationStatusBadge } from "@/components/shared/status-badges";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { listAssessments } from "@/lib/api/assessments";
import { errorMessage } from "@/lib/api/client";
import {
  type InvitationListParams,
  type InvitationSummary,
  listInvitations,
  revokeInvitation,
} from "@/lib/api/invitations";
import { formatDateTime, formatPercent } from "@/lib/format";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { assessmentKeys, invitationKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const WIDE_ONLY = "hidden md:table-cell";

/** Every link sent, newest first, with each test's progress. */
export function SentTable({ onSend }: { onSend: () => void }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [testId, setTestId] = useState("all");
  const [resending, setResending] = useState<InvitationSummary | null>(null);
  const [revoking, setRevoking] = useState<InvitationSummary | null>(null);
  const searchText = useDebouncedValue(search.trim(), 300);

  const params: InvitationListParams = {
    page,
    pageSize: PAGE_SIZE,
    search: searchText || undefined,
    assessmentId: testId === "all" ? undefined : testId,
  };
  const list = useQuery({
    queryKey: invitationKeys.list(params),
    queryFn: () => listInvitations(params),
    placeholderData: keepPreviousData,
  });
  const tests = useQuery({ queryKey: assessmentKeys.list(), queryFn: () => listAssessments() });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeInvitation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invitationKeys.all });
      setRevoking(null);
      toast.success("Link revoked. It stops working straight away.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const filtered = Boolean(searchText) || testId !== "all";
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <InputGroup className="sm:max-w-xs">
          <InputGroupInput
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search candidates"
            aria-label="Search candidates by name or email"
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
        <Select
          value={testId}
          onValueChange={(value) => {
            setTestId(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-56" aria-label="Filter by test">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All tests</SelectItem>
              {tests.data?.map((test) => (
                <SelectItem key={test.id} value={test.id}>
                  {test.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {list.isPending ? (
        <Card aria-busy="true" aria-label="Loading" className="gap-0 py-0">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex items-center gap-4 border-b px-5 py-4 last:border-0">
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-52" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </Card>
      ) : list.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>{errorMessage(list.error)}</AlertTitle>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => void list.refetch()}>
              Try again
            </Button>
          </AlertAction>
        </Alert>
      ) : list.data.items.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SendIcon />
            </EmptyMedia>
            <EmptyTitle>{filtered ? "No matches" : "Nothing sent yet"}</EmptyTitle>
            <EmptyDescription>
              {filtered
                ? "Try another name, or clear the filters."
                : "Send tests to a candidate and they appear here, with their progress and scores."}
            </EmptyDescription>
          </EmptyHeader>
          {filtered ? null : (
            <EmptyContent>
              <Button onClick={onSend}>
                <SendIcon data-icon="inline-start" />
                Send tests
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <Card className={cn("gap-0 py-0 transition-opacity", list.isPlaceholderData && "opacity-60")}>
          <Table>
            <TableCaption className="sr-only">
              Sent links with the candidate, each test’s status and score, and when it was sent
            </TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Candidate</TableHead>
                <TableHead className={WIDE_ONLY}>Tests</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className={WIDE_ONLY}>Sent</TableHead>
                <TableHead className="w-12 pr-5">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.items.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="pl-5 whitespace-normal">
                    <Link
                      href={`/assessments/invitations/${invitation.id}`}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {invitation.candidate.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{invitation.candidate.email}</div>
                  </TableCell>
                  <TableCell className={cn("whitespace-normal", WIDE_ONLY)}>
                    <div className="flex flex-wrap gap-1">
                      {invitation.attempts.map((attempt) => (
                        <Badge
                          key={attempt.id}
                          variant={attempt.status === "SUBMITTED" || attempt.status === "EXPIRED" ? "soft" : "outline"}
                        >
                          {attempt.name}
                          {attempt.score !== null ? ` · ${formatPercent(attempt.score)}` : ""}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <InvitationStatusBadge status={invitation.status} />
                  </TableCell>
                  <TableCell className={cn("text-muted-foreground tabular-nums", WIDE_ONLY)}>
                    {formatDateTime(invitation.createdAt)}
                    {invitation.sentAt === null && invitation.status !== "REVOKED" ? (
                      <div className="text-xs font-medium text-warning">Email not sent</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${invitation.candidate.name}`}
                        >
                          <EllipsisIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44">
                        <DropdownMenuGroup>
                          <DropdownMenuItem asChild>
                            <Link href={`/assessments/invitations/${invitation.id}`}>
                              <EyeIcon />
                              View results
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={invitation.status === "REVOKED" || invitation.status === "COMPLETED"}
                            onSelect={() => setResending(invitation)}
                          >
                            <MailIcon />
                            Resend link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={invitation.status === "REVOKED" || invitation.status === "COMPLETED"}
                            onSelect={() => setRevoking(invitation)}
                          >
                            <BanIcon />
                            Revoke link
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {pages > 1 ? (
            <div className="flex items-center justify-between gap-3 border-t px-5 py-3 text-sm text-muted-foreground">
              <span className="tabular-nums">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => current - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeftIcon data-icon="inline-start" />
                  Newer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page >= pages}
                >
                  Older
                  <ChevronRightIcon data-icon="inline-end" />
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      )}

      <ResendInvitationDialog invitation={resending} onOpenChange={(open) => !open && setResending(null)} />

      <AlertDialog open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke {revoking?.candidate.name}’s link?</AlertDialogTitle>
            <AlertDialogDescription>
              It stops working straight away, even in the middle of a test. Finished tests keep their
              scores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={revoke.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (revoking) revoke.mutate(revoking.id);
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
