import {
  BriefcaseIcon,
  ClipboardCheckIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** The heading this row sits under. */
  group: string;
  /** Planned but not built yet: shown dimmed with a "Soon" badge, and not a link. */
  soon?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * The one navigation model. The sidebar renders it and the topbar reads the
 * page title from it. The routes follow the draft route map in docs/routing.md.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon, group: "Overview" },
  { href: "/candidates", label: "Candidates", icon: UsersIcon, group: "Hiring", soon: true },
  { href: "/jobs", label: "Jobs", icon: BriefcaseIcon, group: "Hiring", soon: true },
  { href: "/assessments", label: "Assessments", icon: ClipboardCheckIcon, group: "Hiring" },
  { href: "/settings", label: "Settings", icon: SettingsIcon, group: "Workspace", soon: true },
];

/**
 * Rows grouped by adjacency: a new group starts whenever `group` changes, so
 * the order of NAV_ITEMS is the only statement of order.
 */
export const NAV_GROUPS: NavGroup[] = NAV_ITEMS.reduce<NavGroup[]>((groups, item) => {
  const last = groups.at(-1);
  if (last?.label === item.group) last.items.push(item);
  else groups.push({ label: item.group, items: [item] });
  return groups;
}, []);

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
