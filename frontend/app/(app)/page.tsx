import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/session";
import { DashboardView } from "./_components/dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // The (app) layout checks the session too, but layouts don't re-render on
  // client-side navigation (docs/authentication.md#protecting-staff-pages).
  await requireUser();

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader title="Dashboard" description="How candidates’ tests are going." />
      <DashboardView />
    </div>
  );
}
