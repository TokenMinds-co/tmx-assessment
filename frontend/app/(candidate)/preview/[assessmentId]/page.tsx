import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { AssessmentPreview } from "@/lib/api/assessments";
import { ApiError } from "@/lib/api/client";
import { serverApiFetch } from "@/lib/api/server-fetch";
import { requireUser } from "@/lib/session";
import { PreviewFlow } from "./_components/preview-flow";

export const metadata: Metadata = { title: "Preview" };

/**
 * Staff only: a test exactly as a candidate takes it, freshly shuffled, with
 * nothing saved. Works on drafts.
 */
export default async function PreviewPage({ params }: PageProps<"/preview/[assessmentId]">) {
  const [{ assessmentId }] = await Promise.all([params, requireUser()]);

  let preview: AssessmentPreview;
  try {
    preview = await serverApiFetch<AssessmentPreview>(
      `/api/assessments/${encodeURIComponent(assessmentId)}/preview`,
    );
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) notFound();
    throw error;
  }
  return <PreviewFlow preview={preview} />;
}
