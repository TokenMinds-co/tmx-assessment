"use client";

import { CheckIcon } from "lucide-react";
import { motion } from "motion/react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useRef } from "react";
import { BLINK, BLINK_TRANSITION, itemVariants } from "@/components/shared/runner-motion";
import { Badge } from "@/components/ui/badge";
import type { TakeQuestion } from "@/lib/api/take";
import { cn } from "@/lib/utils";

/** The keys that pick each option, in the order the options are shown. */
export const OPTION_KEYS = ["A", "B", "C", "D", "E", "F", "G"];

/** The option to mark in a staff preview: the right answer, or the role profile's. */
export interface OptionHighlight {
  optionId: string;
  label: string;
}

interface RunnerOptionsProps {
  question: TakeQuestion;
  value: string | undefined;
  /** The option that's blinking before the runner moves on. */
  blinking: string | null;
  highlight?: OptionHighlight;
  reduceMotion: boolean;
  /** `confirmed` is true for a click or a key letter, false for arrow keys. */
  onChoose: (optionId: string, confirmed: boolean) => void;
  /** Clicking the chosen option again. */
  onConfirm: () => void;
  labelledBy: string;
}

/** Big, keyboard-friendly options: lettered rows, or numbered buttons for a rating scale. */
export function RunnerOptions(props: RunnerOptionsProps) {
  return props.question.type === "RATING_SCALE" ? (
    <RatingScale {...props} />
  ) : (
    <ChoiceList {...props} />
  );
}

const ITEM_BASE =
  "group rounded-xl border border-border-strong bg-card text-foreground shadow-xs transition-[border-color,background-color,box-shadow] duration-150 outline-none hover:border-primary/60 hover:bg-primary-soft/60 focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-primary data-checked:bg-primary-soft data-checked:shadow-[inset_0_0_0_1px_var(--primary)]";

function ChoiceList({
  question,
  value,
  blinking,
  highlight,
  reduceMotion,
  onChoose,
  onConfirm,
  labelledBy,
}: RunnerOptionsProps) {
  // Radix reports a change without saying how it happened. A pointer press
  // confirms the choice; arrow keys only move through the options.
  const pointer = useRef(false);
  const item = itemVariants(reduceMotion);

  return (
    <RadioGroupPrimitive.Root
      value={value ?? ""}
      onValueChange={(id) => {
        onChoose(id, pointer.current);
        pointer.current = false;
      }}
      aria-labelledby={labelledBy}
      loop
      className="flex flex-col gap-2.5"
    >
      {question.options.map((option, index) => (
        <motion.div key={option.id} variants={item}>
          <RadioGroupPrimitive.Item
            value={option.id}
            onPointerDown={() => {
              pointer.current = true;
            }}
            onClick={() => {
              if (value === option.id) onConfirm();
            }}
            className={cn(
              ITEM_BASE,
              "flex min-h-13 w-full items-center px-3 py-2.5 text-left text-[15px] leading-snug md:text-base",
              highlight?.optionId === option.id &&
                "ring-2 ring-success/70 ring-offset-2 ring-offset-background",
            )}
          >
            <motion.span
              className="flex w-full items-center gap-3"
              animate={blinking === option.id ? BLINK : { opacity: 1 }}
              transition={BLINK_TRANSITION}
            >
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border-strong bg-background text-xs font-semibold text-muted-foreground transition-colors group-data-checked:border-primary group-data-checked:bg-primary group-data-checked:text-primary-foreground"
              >
                {OPTION_KEYS[index] ?? index + 1}
              </span>
              <span className="min-w-0 flex-1">{option.text}</span>
              {highlight?.optionId === option.id ? (
                <Badge variant="success">{highlight.label}</Badge>
              ) : null}
              <CheckIcon
                aria-hidden="true"
                className="size-5 shrink-0 text-primary opacity-0 transition-opacity group-data-checked:opacity-100"
              />
            </motion.span>
          </RadioGroupPrimitive.Item>
        </motion.div>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

function RatingScale({
  question,
  value,
  blinking,
  highlight,
  reduceMotion,
  onChoose,
  onConfirm,
  labelledBy,
}: RunnerOptionsProps) {
  const pointer = useRef(false);
  const item = itemVariants(reduceMotion);
  const { options } = question;
  const lastIndex = options.length - 1;

  return (
    <div className="flex flex-col gap-3">
      <RadioGroupPrimitive.Root
        value={value ?? ""}
        onValueChange={(id) => {
          onChoose(id, pointer.current);
          pointer.current = false;
        }}
        aria-labelledby={labelledBy}
        orientation="horizontal"
        loop
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option, index) => (
          <motion.div key={option.id} variants={item} className="flex flex-col items-center gap-1.5">
            <RadioGroupPrimitive.Item
              value={option.id}
              aria-label={option.text ? `${index + 1}, ${option.text}` : String(index + 1)}
              onPointerDown={() => {
                pointer.current = true;
              }}
              onClick={() => {
                if (value === option.id) onConfirm();
              }}
              className={cn(
                ITEM_BASE,
                "flex h-14 w-full items-center justify-center text-lg font-semibold tabular-nums data-checked:text-primary md:h-16",
                highlight?.optionId === option.id &&
                  "ring-2 ring-success/70 ring-offset-2 ring-offset-background",
              )}
            >
              <motion.span
                animate={blinking === option.id ? BLINK : { opacity: 1 }}
                transition={BLINK_TRANSITION}
              >
                {index + 1}
              </motion.span>
            </RadioGroupPrimitive.Item>
            {index > 0 && index < lastIndex && option.text ? (
              <span className="text-center text-[11px] leading-tight text-muted-foreground">
                {option.text}
              </span>
            ) : null}
            {highlight?.optionId === option.id ? (
              <span className="text-[11px] font-semibold text-success">{highlight.label}</span>
            ) : null}
          </motion.div>
        ))}
      </RadioGroupPrimitive.Root>
      {options[0]?.text || options[lastIndex]?.text ? (
        <div className="flex justify-between gap-6 text-xs leading-snug text-muted-foreground md:text-sm">
          <span className="max-w-[45%]">{options[0]?.text}</span>
          <span className="max-w-[45%] text-right">{options[lastIndex]?.text}</span>
        </div>
      ) : null}
    </div>
  );
}
