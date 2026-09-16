import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { AssessmentEditor } from "./_components/assessment-editor";

export const metadata: Metadata = { title: "Test" };

export default async function AssessmentEditorPage({ params }: PageProps<"/assessments/[id]">) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  return <AssessmentEditor id={id} isAdmin={user.role === "ADMIN"} />;
}
