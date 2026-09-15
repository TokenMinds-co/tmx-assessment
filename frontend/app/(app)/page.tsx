import type { Metadata } from "next";
import { InfoIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import {
  SAMPLE_ASSESSMENTS,
  SAMPLE_PIPELINE,
  SAMPLE_RECENT_RESULTS,
} from "@/lib/sample-data";
import { AssessmentCard } from "./_components/assessment-card";
import { PipelineCard } from "./_components/pipeline-card";
import { RecentResultsCard } from "./_components/recent-results-card";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Dashboard"
        description="Where candidates are in the pipeline, and how their tests are going."
      >
        {/* Every number on this page is invented until the API exists (lib/sample-data.ts). */}
        <Badge variant="outline">
          <InfoIcon data-icon="inline-start" />
          Sample data
        </Badge>
      </PageHeader>

      <PipelineCard pipeline={SAMPLE_PIPELINE} />

      <div className="grid gap-6 xl:grid-cols-5">
        <AssessmentCard summary={SAMPLE_ASSESSMENTS} className="min-w-0 xl:col-span-3" />
        <RecentResultsCard results={SAMPLE_RECENT_RESULTS} className="min-w-0 xl:col-span-2" />
      </div>
    </div>
  );
}
