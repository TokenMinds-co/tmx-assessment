import { cookies } from "next/headers";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { Topbar } from "@/components/shared/topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireUser } from "@/lib/session";

/** The staff app shell: sidebar rail, topbar, and the page on the canvas. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // requireUser() sends anyone without a live session to /login.
  const [cookieStore, user] = await Promise.all([cookies(), requireUser()]);
  // The sidebar stores its open or collapsed state in this cookie. Reading it
  // here renders the rail at the right width on the first paint.
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        {/* Only what the account menu shows is sent to the browser. */}
        <Topbar user={{ name: user.name, email: user.email }} />
        <main className="min-w-0 flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
