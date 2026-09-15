"use client";

import { useState } from "react";
import { ChevronDownIcon, LogOutIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { signOut, type User } from "@/lib/api/auth";
import { initials } from "@/lib/format";

/** Account menu in the topbar: who is signed in, and "Sign out". */
export function UserMenu({ user }: { user: Pick<User, "name" | "email"> }) {
  const [signOutState, setSignOutState] = useState<"idle" | "pending" | "failed">("idle");
  const pending = signOutState === "pending";

  async function handleSignOut(event: Event) {
    // Keep the menu open, so the spinner or the error has somewhere to show.
    event.preventDefault();
    if (pending) return;

    setSignOutState("pending");
    try {
      await signOut();
    } catch {
      setSignOutState("failed");
      return;
    }
    // A full page load, not router.replace(): it drops everything this session
    // left in memory, including the router cache that Back would restore. The
    // state stays "pending" until the page is gone.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }

  return (
    <DropdownMenu
      // A failure message shouldn't greet the next opening of the menu.
      onOpenChange={() => setSignOutState((state) => (state === "failed" ? "idle" : state))}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${user.name}`}
          className="flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:bg-accent"
        >
          <Avatar>
            <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-35 truncate text-[13px] font-semibold text-foreground md:block">
            {user.name}
          </span>
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-55">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-[13px] font-semibold text-foreground">{user.name}</span>
            <span className="truncate text-xs font-normal">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
            {pending ? <Spinner /> : <LogOutIcon />}
            {pending ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
          {signOutState === "failed" ? (
            <p role="alert" className="max-w-55 px-2.5 pt-1 pb-2 text-xs text-destructive">
              Couldn’t sign out. Check your connection and try again.
            </p>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
