import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { AssessmentsView } from "./_components/assessments-view";

export const metadata: Metadata = { title: "Assessments" };

export default async function AssessmentsPage({ searchParams }: PageProps<"/assessments">) {
  const [user, { tab }] = await Promise.all([requireUser(), searchParams]);
  return (
    <AssessmentsView isAdmin={user.role === "ADMIN"} initialTab={tab === "sent" ? "sent" : "library"} />
  );
}
