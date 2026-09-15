import { cookies } from "next/headers";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/** The staff app shell: sidebar rail, topbar, and the page on the canvas. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The sidebar stores its open or collapsed state in this cookie. Reading it
  // here renders the rail at the right width on the first paint.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <Topbar />
        <main className="min-w-0 flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
