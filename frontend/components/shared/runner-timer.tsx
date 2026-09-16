import { TimerIcon } from "lucide-react";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The countdown pill. It turns amber for the last minute. */
export function RunnerTimer({ remainingMs }: { remainingMs: number }) {
  const lastMinute = remainingMs <= 60_000;
  return (
    <div
      role="timer"
      aria-label={`Time left: ${formatClock(remainingMs)}`}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold tabular-nums transition-colors duration-300",
        lastMinute
          ? "border-warning/30 bg-warning-soft text-warning"
          : "border-border-strong bg-card text-foreground",
      )}
    >
      <TimerIcon aria-hidden="true" className="size-4" />
      {formatClock(remainingMs)}
    </div>
  );
}
