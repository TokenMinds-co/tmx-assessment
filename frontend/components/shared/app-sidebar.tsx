"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftCloseIcon, PanelLeftOpenIcon, XIcon } from "lucide-react";
import mark from "@/public/brand/tmx-mark.png";
import { NAV_GROUPS, isNavItemActive, type NavItem } from "@/components/shared/nav-items";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;

/**
 * The gradient navigation rail: 270px wide, 68px collapsed, and a sheet on
 * phones. The collapsed choice is kept in the `sidebar_state` cookie, and
 * Ctrl/⌘+B toggles it.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  // Next navigates in place, so on a phone the sheet would stay open over the
  // page that was just picked. Every link closes it on click.
  const closeSheet = () => setOpenMobile(false);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex-row items-center gap-3 p-4.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
        <Image
          src={mark}
          alt=""
          width={36}
          height={36}
          loading="eager"
          className="size-9 shrink-0 rounded-lg"
        />
        <p className="min-w-0 flex-1 truncate text-base font-bold text-sidebar-primary group-data-[collapsible=icon]:sr-only">
          TMX HR
        </p>
        {isMobile ? (
          <button
            type="button"
            onClick={closeSheet}
            aria-label="Close navigation"
            className="shrink-0 rounded-lg p-1.5 text-sidebar-foreground transition-colors outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <XIcon className="size-5" aria-hidden="true" />
          </button>
        ) : null}
      </SidebarHeader>

      <SidebarContent className="gap-0 pt-2">
        {NAV_GROUPS.map((group, index) => (
          <SidebarGroup key={group.label} className="py-0">
            {/* Collapsed, the headings hide, so a hairline keeps the groups apart. */}
            {index > 0 ? (
              <SidebarSeparator className="mx-3 my-1.5 hidden group-data-[collapsible=icon]:block" />
            ) : null}
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu className="gap-1.5">
              {group.items.map((item) => (
                <NavRow
                  key={item.href}
                  item={item}
                  active={isNavItemActive(item, pathname)}
                  onNavigate={closeSheet}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Desktop only. On a phone the footer would sit on the gradient's
          lightest end, where the small version line drops to about 4:1. */}
      {isMobile ? null : (
        <SidebarFooter className="gap-2 px-2 pb-4">
          <SidebarSeparator className="mx-1.5 group-data-[collapsible=icon]:hidden" />
          <p className="px-3 text-xs text-sidebar-primary group-data-[collapsible=icon]:hidden">
            TMX HR · v{APP_VERSION}
          </p>
          <CollapseButton />
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

function NavRow({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  if (item.soon) {
    // Planned, not built. Shown so the shape of the app is visible, but dimmed
    // and kept out of the tab order, since there is nowhere to go yet.
    return (
      <SidebarMenuItem>
        <SidebarMenuButton aria-disabled="true" tabIndex={-1} className="pr-16">
          <Icon />
          <span>
            {item.label}
            <span className="sr-only"> (coming soon)</span>
          </span>
        </SidebarMenuButton>
        <SidebarMenuBadge
          aria-hidden="true"
          className="right-2 rounded-full bg-sidebar-accent px-2 text-[10px] font-semibold tracking-wide uppercase"
        >
          Soon
        </SidebarMenuBadge>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
        <Link href={item.href} aria-current={active ? "page" : undefined} onClick={onNavigate}>
          <Icon />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function CollapseButton() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={label}
      title={`${label} (Ctrl/⌘ B)`}
      // A dark fill where the reference has a white one: this button sits on
      // the lightest end of the gradient, and a white tint there drops the
      // white label below 4.5:1 contrast.
      className="flex h-9 items-center gap-2.5 rounded-lg bg-black/15 px-3 text-sm font-semibold text-sidebar-primary transition-colors outline-hidden hover:bg-black/25 focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
    >
      {collapsed ? (
        <PanelLeftOpenIcon className="size-4.5" aria-hidden="true" />
      ) : (
        <>
          <PanelLeftCloseIcon className="size-4.5" aria-hidden="true" />
          <span>Collapse</span>
        </>
      )}
    </button>
  );
}
