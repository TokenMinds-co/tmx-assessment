"use client";

import Link from "next/link";
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
import { initials } from "@/lib/format";
import { SAMPLE_USER } from "@/lib/sample-data";

/**
 * Account menu in the topbar. Shows the sample user until sessions exist, and
 * "Sign out" only links back to /login for now (docs/authentication.md).
 */
export function UserMenu() {
  const user = SAMPLE_USER;

  return (
    <DropdownMenu>
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
          <DropdownMenuItem asChild variant="destructive">
            <Link href="/login">
              <LogOutIcon />
              Sign out
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
