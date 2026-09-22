import Image from "next/image";
import wordmark from "@/public/brand/tmx-wordmark.png";
import { cn } from "@/lib/utils";

/**
 * The TMX Assessment lockup: the TMX wordmark artwork, then "Assessment" set in
 * Inter.
 *
 * One font size drives both halves. The wordmark is 1em tall and "Assessment"
 * is set at 1.375em, because Inter's capitals are 0.727em tall: 1.375 × 0.727 ≈
 * 1, so the A matches the wordmark's height. At `leading-none` Inter's capitals
 * sit in the middle of the line box, so `items-center` lines the two up.
 *
 * Size it with a text-size class, for example `text-[40px]`. The default is
 * 26px rather than the wordmark's own 34px because "Assessment" is a long word:
 * at 34px the lockup is wider than a phone screen.
 */
export function TmxAssessmentLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-[0.28em] text-[26px]", className)}>
      <Image
        src={wordmark}
        alt="TMX"
        width={148}
        height={43}
        loading="eager"
        className="h-[1em] w-auto"
      />
      <span className="text-[1.375em] leading-none font-semibold tracking-[-0.02em] text-brand-ink">
        Assessment
      </span>
    </span>
  );
}
