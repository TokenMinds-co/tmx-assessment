import Image from "next/image";
import wordmark from "@/public/brand/tmx-wordmark.png";
import { cn } from "@/lib/utils";

/**
 * The company mark on candidate pages. Candidates don't know the internal
 * app, so they see the TokenMinds wordmark, not the TMX HR lockup.
 *
 * `w-fit`, not `w-auto`: most candidate pages put the mark straight into a
 * flex column, whose default stretch widens an auto-width image to the full
 * column and squashes the artwork. A fit-content width keeps the artwork's
 * proportions in a column or a row.
 */
export function CandidateBrand({ className }: { className?: string }) {
  return (
    <Image
      src={wordmark}
      alt="TokenMinds"
      width={148}
      height={43}
      loading="eager"
      className={cn("h-5 w-fit shrink-0", className)}
    />
  );
}
