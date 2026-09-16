"use client";

import { PlusIcon, SendIcon, UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SendAssessmentDialog } from "@/components/shared/send-assessment-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImportJsonDialog } from "./import-json-dialog";
import { LibraryTable } from "./library-table";
import { NewAssessmentDialog } from "./new-assessment-dialog";
import { SentTable } from "./sent-table";

type Tab = "library" | "sent";

/** The Assessments page: the test library, and everything sent to candidates. */
export function AssessmentsView({ isAdmin, initialTab }: { isAdmin: boolean; initialTab: Tab }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [sendIds, setSendIds] = useState<string[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  function changeTab(value: string) {
    const next: Tab = value === "sent" ? "sent" : "library";
    setTab(next);
    // The tab lives in the address too, so Back and shared links land on it.
    router.replace(next === "sent" ? "/assessments?tab=sent" : "/assessments", { scroll: false });
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Assessments"
        description="Build tests, send them to candidates with one link, and read the results."
      >
        {isAdmin ? (
          <>
            <Button variant="outline" onClick={() => setImporting(true)}>
              <UploadIcon data-icon="inline-start" />
              Import
            </Button>
            <Button variant="outline" onClick={() => setCreating(true)}>
              <PlusIcon data-icon="inline-start" />
              New test
            </Button>
          </>
        ) : null}
        <Button onClick={() => setSendIds([])}>
          <SendIcon data-icon="inline-start" />
          Send tests
        </Button>
      </PageHeader>

      <Tabs value={tab} onValueChange={changeTab} className="gap-4">
        <TabsList variant="line">
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>
        <TabsContent value="library">
          <LibraryTable
            isAdmin={isAdmin}
            onSend={(id) => setSendIds([id])}
            onCreate={() => setCreating(true)}
          />
        </TabsContent>
        <TabsContent value="sent">
          <SentTable onSend={() => setSendIds([])} />
        </TabsContent>
      </Tabs>

      <SendAssessmentDialog
        open={sendIds !== null}
        onOpenChange={(open) => {
          if (!open) setSendIds(null);
        }}
        defaultAssessmentIds={sendIds ?? []}
      />
      <NewAssessmentDialog open={creating} onOpenChange={setCreating} />
      <ImportJsonDialog open={importing} onOpenChange={setImporting} />
    </div>
  );
}
