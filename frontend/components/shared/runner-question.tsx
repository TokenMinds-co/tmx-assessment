"use client";

import { ArrowRightIcon, InfoIcon } from "lucide-react";
import { motion } from "motion/react";
import { RunnerAudio } from "@/components/shared/runner-audio";
import { itemVariants, listVariants } from "@/components/shared/runner-motion";
import { type OptionHighlight, RunnerOptions } from "@/components/shared/runner-options";
import type { TakeQuestion } from "@/lib/api/take";

/** One question: its instruction, passage, audio, the question itself and the options. */
export function RunnerQuestion({
  question,
  total,
  value,
  blinking,
  highlight,
  reduceMotion,
  audioReplays,
  plays,
  onPlay,
  onChoose,
  onConfirm,
  headingRef,
}: {
  question: TakeQuestion;
  total: number;
  value: string | undefined;
  blinking: string | null;
  highlight?: OptionHighlight;
  reduceMotion: boolean;
  audioReplays: number;
  plays: number;
  onPlay: () => void;
  onChoose: (optionId: string, confirmed: boolean) => void;
  onConfirm: () => void;
  headingRef: (node: HTMLHeadingElement | null) => void;
}) {
  const item = itemVariants(reduceMotion);
  const headingId = `question-${question.id}`;

  return (
    <div className="flex flex-col gap-5">
      {question.instruction ? (
        <motion.p variants={item} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
          <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="max-w-[70ch]">{question.instruction}</span>
        </motion.p>
      ) : null}

      {question.context ? (
        <motion.div
          variants={item}
          className="max-w-[70ch] rounded-xl border bg-card px-4 py-3.5 text-[15px] leading-relaxed whitespace-pre-line text-foreground shadow-card md:px-5 md:py-4"
        >
          {question.context}
        </motion.div>
      ) : null}

      {question.media ? (
        <motion.div variants={item}>
          <RunnerAudio
            key={question.id}
            src={question.media.url}
            replays={audioReplays}
            plays={plays}
            onPlay={onPlay}
          />
        </motion.div>
      ) : null}

      <motion.h2
        variants={item}
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="flex gap-3 text-lg leading-snug font-semibold tracking-[-0.01em] text-balance text-foreground outline-none md:text-xl"
      >
        <span
          aria-hidden="true"
          className="mt-[0.2em] flex shrink-0 items-center gap-1 text-base font-semibold text-primary tabular-nums"
        >
          {question.number}
          <ArrowRightIcon className="size-4" />
        </span>
        <span>
          <span className="sr-only">
            Question {question.number} of {total}.{" "}
          </span>
          {question.stem}
        </span>
      </motion.h2>

      <motion.div variants={listVariants(reduceMotion)} className="pt-1">
        <RunnerOptions
          question={question}
          value={value}
          blinking={blinking}
          highlight={highlight}
          reduceMotion={reduceMotion}
          onChoose={onChoose}
          onConfirm={onConfirm}
          labelledBy={headingId}
        />
      </motion.div>
    </div>
  );
}
