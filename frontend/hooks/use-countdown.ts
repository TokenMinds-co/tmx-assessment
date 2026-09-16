import { useSyncExternalStore } from "react";

const TICK_MS = 250;

// A shared clock that ticks four times a second while something listens.
function subscribe(onTick: () => void) {
  const timer = window.setInterval(onTick, TICK_MS);
  return () => window.clearInterval(timer);
}
const getTick = () => Math.floor(Date.now() / TICK_MS);
const getServerTick = () => 0;

/**
 * Milliseconds left until `deadline`, or null without one. `offsetMs` is the
 * server's clock minus this device's, measured when the attempt loaded, so a
 * wrong device clock doesn't change the time limit.
 */
export function useCountdown(deadline: string | null | undefined, offsetMs = 0): number | null {
  const tick = useSyncExternalStore(subscribe, getTick, getServerTick);
  if (!deadline) return null;
  return Math.max(0, Date.parse(deadline) - (tick * TICK_MS + offsetMs));
}
