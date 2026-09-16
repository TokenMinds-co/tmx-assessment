import Image from "next/image";
import wordmark from "@/public/brand/tmx-wordmark.png";
import { cn } from "@/lib/utils";

/**
 * The TMX HR lockup: the TMX wordmark artwork, then "HR" set in Inter.
 *
 * One font size drives both halves. The wordmark is 1em tall and "HR" is set at
 * 1.375em, because Inter's capitals are 0.727em tall: 1.375 × 0.727 ≈ 1, so
 * the letters match the wordmark's height. At `leading-none` Inter's capitals
 * sit in the middle of the line box, so `items-center` lines the two up.
 *
 * Size it with a text-size class, for example `text-[40px]`.
 */
export function TmxHrLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-[0.28em] text-[34px]", className)}>
      <Image
        src={wordmark}
        alt="TMX"
        width={148}
        height={43}
        loading="eager"
        className="h-[1em] w-auto"
      />
      <span className="text-[1.375em] leading-none font-semibold tracking-[-0.02em] text-brand-ink">
        HR
      </span>
    </span>
  );
}
