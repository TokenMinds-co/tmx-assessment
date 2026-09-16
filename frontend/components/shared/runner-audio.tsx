"use client";

import { PauseIcon, PlayIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/lib/format";

/**
 * A clip player without a seek bar. Each clip plays once plus `replays` more
 * times; pausing and resuming doesn't use one up. The count is kept by the
 * runner, so it survives moving between questions. It's enforced here only.
 */
export function RunnerAudio({
  src,
  replays,
  plays,
  onPlay,
}: {
  src: string;
  replays: number;
  /** Times this clip was started from the beginning. */
  plays: number;
  onPlay: () => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const allowed = replays + 1;
  const left = Math.max(0, allowed - plays);
  const atStart = time === 0 || (duration > 0 && time >= duration - 0.05);
  const blocked = !playing && atStart && left === 0;

  function toggle() {
    const element = audio.current;
    if (!element) return;
    if (playing) {
      element.pause();
      return;
    }
    if (atStart) {
      if (left === 0) return;
      onPlay();
      element.currentTime = 0;
    }
    element.play().catch(() => setPlaying(false));
  }

  const label = playing ? "Pause the clip" : atStart ? (plays === 0 ? "Play the clip" : "Play the clip again") : "Resume the clip";
  const status =
    plays === 0
      ? allowed === 1
        ? "Plays once"
        : `You can play it ${allowed} times`
      : left > 0
        ? `${left} ${left === 1 ? "replay" : "replays"} left`
        : "No replays left";

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-card">
      <Button
        type="button"
        size="icon"
        className="rounded-full"
        onClick={toggle}
        disabled={blocked}
        aria-label={label}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </Button>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-primary/15">
          <div
            className="h-full origin-left rounded-full bg-primary transition-transform duration-200 ease-linear"
            style={{ transform: `scaleX(${duration > 0 ? Math.min(1, time / duration) : 0})` }}
          />
        </div>
        <div className="flex justify-between gap-3 text-xs text-muted-foreground tabular-nums">
          <span>
            {formatClock(time * 1000)} / {formatClock(duration * 1000)}
          </span>
          <span>{status}</span>
        </div>
      </div>
      <audio
        ref={audio}
        src={src}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
      />
    </div>
  );
}
