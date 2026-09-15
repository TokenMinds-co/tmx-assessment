"use client";

import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";
import { NAV_ITEMS, isNavItemActive } from "@/components/shared/nav-items";
import { UserMenu } from "@/components/shared/user-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import type { User } from "@/lib/api/auth";

/** The white bar above every staff page: breadcrumb on the left, account menu on the right. */
export function Topbar({ user }: { user: Pick<User, "name" | "email"> }) {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const title = NAV_ITEMS.find((item) => isNavItemActive(item, pathname))?.label ?? "TMX HR";

  return (
    <header className="sticky top-0 z-30 flex h-15 shrink-0 items-center gap-2 border-b bg-card pr-2 pl-3 md:h-19.25 md:gap-4 md:pr-7.5 md:pl-8">
      {/* Under `md` the rail is a sheet, and this is the only way to open it. */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        aria-label="Open navigation"
        className="-ml-1 md:hidden"
      >
        <MenuIcon />
      </Button>

      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap">
          <BreadcrumbItem className="hidden sm:inline-flex">TMX HR</BreadcrumbItem>
          <BreadcrumbSeparator className="hidden sm:block" />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate font-semibold">{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <UserMenu user={user} />
    </header>
  );
}
