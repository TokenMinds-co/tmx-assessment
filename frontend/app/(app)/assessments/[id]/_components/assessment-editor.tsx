"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon, FileQuestionIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SendAssessmentDialog } from "@/components/shared/send-assessment-dialog";
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAssessment } from "@/lib/api/assessments";
import { ApiError, errorMessage } from "@/lib/api/client";
import { assessmentKeys } from "@/lib/query-keys";
import { EditorHeader } from "./editor-header";
import { EditorSkeleton } from "./editor-skeleton";
import { QuestionsTab } from "./questions-tab";
import { RoleProfileTab } from "./role-profile-tab";
import { ScoringTab } from "./scoring-tab";
import { SettingsTab } from "./settings-tab";

type Tab = "questions" | "profile" | "scoring" | "settings";
/** Every tab stays mounted, so unsaved edits survive a switch. */
const KEEP_MOUNTED = "data-[state=inactive]:hidden";

/** One test: its questions, role profile, scoring and settings. Members read; admins edit. */
export function AssessmentEditor({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  const detail = useQuery({ queryKey: assessmentKeys.detail(id), queryFn: () => getAssessment(id) });
  const [tab, setTab] = useState<Tab>("questions");
  const [sending, setSending] = useState(false);

  if (detail.isPending) return <EditorSkeleton />;
  if (detail.isError) {
    const missing = detail.error instanceof ApiError && (detail.error.status === 404 || detail.error.status === 400);
    return (
      <div className="p-4 md:p-6">
        {missing ? (
          <Empty className="border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileQuestionIcon />
              </EmptyMedia>
              <EmptyTitle>This test doesn’t exist</EmptyTitle>
              <EmptyDescription>It may have been deleted, or the link is wrong.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/assessments">Back to Assessments</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>{errorMessage(detail.error)}</AlertTitle>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={() => void detail.refetch()}>
                Try again
              </Button>
            </AlertAction>
          </Alert>
        )}
      </div>
    );
  }

  const assessment = detail.data;
  const alignment = assessment.scoringMethod === "ALIGNMENT";
  const activeTab: Tab = tab === "profile" && !alignment ? "questions" : tab;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <EditorHeader assessment={assessment} isAdmin={isAdmin} onSend={() => setSending(true)} />

      <Tabs value={activeTab} onValueChange={(value) => setTab(value as Tab)} className="gap-4">
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <TabsList variant="line">
            <TabsTrigger value="questions">
              Questions
              <span className="text-xs font-normal text-muted-foreground tabular-nums">{assessment.questionCount}</span>
            </TabsTrigger>
            {alignment ? <TabsTrigger value="profile">Role profile</TabsTrigger> : null}
            <TabsTrigger value="scoring">Scoring</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="questions" forceMount className={KEEP_MOUNTED}>
          <QuestionsTab assessment={assessment} isAdmin={isAdmin} />
        </TabsContent>
        {alignment ? (
          <TabsContent value="profile" forceMount className={KEEP_MOUNTED}>
            <RoleProfileTab assessment={assessment} isAdmin={isAdmin} />
          </TabsContent>
        ) : null}
        <TabsContent value="scoring" forceMount className={KEEP_MOUNTED}>
          <ScoringTab assessment={assessment} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="settings" forceMount className={KEEP_MOUNTED}>
          <SettingsTab assessment={assessment} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>

      <SendAssessmentDialog open={sending} onOpenChange={setSending} defaultAssessmentIds={[assessment.id]} />
    </div>
  );
}
