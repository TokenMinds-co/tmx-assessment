"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  addedOption,
  type DraftProblems,
  LETTERS,
  MAX_CHOICES,
  MAX_POINTS,
  MIN_POINTS,
  type OptionDraft,
  type QuestionDraft,
  resizeScale,
  scaleValues,
} from "./question-draft";

type OptionsPatch = Partial<Pick<QuestionDraft, "options" | "employerKey">>;

interface OptionsEditorProps {
  draft: QuestionDraft;
  onChange: (patch: OptionsPatch) => void;
  problems: DraftProblems;
  idPrefix: string;
}

/** The answers a question offers, shaped by its type. */
export function OptionsEditor(props: OptionsEditorProps) {
  return props.draft.type === "SINGLE_CHOICE" || props.draft.type === "TRUE_FALSE" ? (
    <ChoiceOptions {...props} />
  ) : (
    <ScaleOptions {...props} />
  );
}

function withText(options: OptionDraft[], key: string, field: "text" | "employerText", value: string) {
  return options.map((option) => (option.key === key ? { ...option, [field]: value } : option));
}

function ChoiceOptions({ draft, onChange, problems, idPrefix }: OptionsEditorProps) {
  const fixed = draft.type === "TRUE_FALSE";
  const correctKey = draft.options.find((option) => option.isCorrect)?.key ?? "";

  return (
    <FieldSet data-invalid={problems.options ? true : undefined}>
      <FieldLegend variant="label">{fixed ? "Answer" : "Options"}</FieldLegend>
      <FieldDescription>
        {fixed ? "Mark whether the statement is true or false." : "Mark the right answer with the circle beside it."}
      </FieldDescription>
      <RadioGroup
        value={correctKey}
        onValueChange={(key) =>
          onChange({ options: draft.options.map((option) => ({ ...option, isCorrect: option.key === key })) })
        }
        aria-label="Right answer"
        className="gap-2"
      >
        {draft.options.map((option, index) => {
          const letter = LETTERS[index] ?? String(index + 1);
          const name = fixed ? option.text : `Option ${letter}`;
          return (
            <div
              key={option.key}
              className={cn(
                "flex items-center gap-2 rounded-lg border py-1.5 pr-1.5 pl-2 transition-colors",
                option.isCorrect ? "border-success/40 bg-success-soft" : "border-border bg-card",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold transition-colors",
                  option.isCorrect
                    ? "border-success bg-success text-primary-foreground"
                    : "border-border-strong bg-background text-muted-foreground",
                )}
              >
                {letter}
              </span>
              {fixed ? (
                <span className="flex-1 px-1 text-sm font-medium">{option.text}</span>
              ) : (
                <Input
                  id={`${idPrefix}-option-${option.key}`}
                  value={option.text}
                  onChange={(event) => onChange({ options: withText(draft.options, option.key, "text", event.target.value) })}
                  placeholder={name}
                  aria-label={name}
                  className="h-9 flex-1 bg-background"
                />
              )}
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 px-1.5 text-xs font-medium text-muted-foreground">
                <RadioGroupItem value={option.key} aria-label={`${name} is the right answer`} />
                <span className={cn("hidden sm:inline", option.isCorrect && "text-success")}>
                  {option.isCorrect ? "Right answer" : "Right"}
                </span>
              </label>
              {fixed ? null : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={draft.options.length <= 2}
                  onClick={() => onChange({ options: draft.options.filter((item) => item.key !== option.key) })}
                  aria-label={`Remove ${name}`}
                >
                  <XIcon />
                </Button>
              )}
            </div>
          );
        })}
      </RadioGroup>
      {!fixed && draft.options.length < MAX_CHOICES ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => onChange({ options: [...draft.options, addedOption()] })}
        >
          <PlusIcon data-icon="inline-start" />
          Add option
        </Button>
      ) : null}
      <FieldError>{problems.options}</FieldError>
    </FieldSet>
  );
}

const POINT_COUNTS = Array.from({ length: MAX_POINTS - MIN_POINTS + 1 }, (_, index) => MIN_POINTS + index);

function ScaleOptions({ draft, onChange, problems, idPrefix }: OptionsEditorProps) {
  const rating = draft.type === "RATING_SCALE";
  const values = scaleValues(draft.options);
  const lastIndex = draft.options.length - 1;

  function resize(size: number) {
    const options = resizeScale(draft.options, size);
    onChange({
      options,
      employerKey: options.some((option) => option.key === draft.employerKey) ? draft.employerKey : null,
    });
  }

  function remove(key: string) {
    onChange({
      // Renumbered 1 to n once a choice goes.
      options: draft.options.filter((option) => option.key !== key).map((option) => ({ ...option, value: null })),
      employerKey: draft.employerKey === key ? null : draft.employerKey,
    });
  }

  function placeholder(index: number, forRole: boolean) {
    if (!rating) return forRole ? "Same as the candidate’s, or reworded" : `Choice ${index + 1}`;
    if (index === 0) return forRole ? "e.g. Not at all" : "e.g. Not important";
    if (index === lastIndex) return forRole ? "e.g. To a large extent" : "e.g. Extremely important";
    return "Optional";
  }

  return (
    <FieldSet data-invalid={problems.options || problems.employer ? true : undefined}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <FieldLegend variant="label">{rating ? "Scale" : "Choices"}</FieldLegend>
          <FieldDescription>
            {rating
              ? "Label the ends, and the middle points if it helps. Then pick the point that fits the role."
              : "List the choices in order. Then pick the one that fits the role."}
          </FieldDescription>
        </div>
        {rating ? (
          <Select value={String(draft.options.length)} onValueChange={(value) => resize(Number(value))}>
            <SelectTrigger aria-label="Points on the scale" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POINT_COUNTS.map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {count} points
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <div
        aria-hidden="true"
        className="hidden grid-cols-[1.75rem_1fr_1fr_6.5rem_2rem] gap-2 px-2 text-xs font-medium text-muted-foreground sm:grid"
      >
        <span />
        <span>Candidate sees</span>
        <span>Role profile sees</span>
        <span>Fits the role</span>
        <span />
      </div>

      <RadioGroup
        value={draft.employerKey ?? ""}
        onValueChange={(key) => onChange({ employerKey: key })}
        aria-label="The answer that fits the role"
        className="gap-2"
      >
        {draft.options.map((option, index) => {
          const value = values[index] ?? index + 1;
          const picked = option.key === draft.employerKey;
          return (
            <div
              key={option.key}
              className={cn(
                "grid grid-cols-[1.75rem_1fr_auto] items-center gap-2 rounded-lg border py-1.5 pr-1.5 pl-2 transition-colors sm:grid-cols-[1.75rem_1fr_1fr_6.5rem_2rem]",
                picked ? "border-primary/40 bg-primary-soft" : "border-border bg-card",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-7 items-center justify-center rounded-md border text-xs font-semibold tabular-nums transition-colors",
                  picked
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border-strong bg-background text-muted-foreground",
                )}
              >
                {value}
              </span>
              <Input
                id={`${idPrefix}-point-${option.key}`}
                value={option.text}
                onChange={(event) => onChange({ options: withText(draft.options, option.key, "text", event.target.value) })}
                placeholder={placeholder(index, false)}
                aria-label={`${rating ? "Point" : "Choice"} ${value}, what the candidate sees`}
                className="h-9 bg-background"
              />
              <Input
                value={option.employerText}
                onChange={(event) =>
                  onChange({ options: withText(draft.options, option.key, "employerText", event.target.value) })
                }
                placeholder={placeholder(index, true)}
                aria-label={`${rating ? "Point" : "Choice"} ${value}, what the role profile sees`}
                className="order-last col-span-2 col-start-2 h-9 bg-background sm:order-none sm:col-span-1 sm:col-start-auto"
              />
              <label className="flex cursor-pointer items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                <RadioGroupItem value={option.key} aria-label={`${value} fits the role`} />
                <span className={cn("hidden sm:inline", picked && "text-primary")}>{picked ? "Role’s pick" : "Pick"}</span>
              </label>
              {rating ? (
                <span className="hidden sm:block" />
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="hidden sm:inline-flex"
                  disabled={draft.options.length <= 2}
                  onClick={() => remove(option.key)}
                  aria-label={`Remove choice ${value}`}
                >
                  <XIcon />
                </Button>
              )}
            </div>
          );
        })}
      </RadioGroup>

      {rating ? null : (
        <div className="flex flex-wrap gap-2">
          {draft.options.length < MAX_CHOICES ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange({ options: [...draft.options, addedOption()] })}
            >
              <PlusIcon data-icon="inline-start" />
              Add choice
            </Button>
          ) : null}
          {draft.options.length > 2 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="sm:hidden"
              onClick={() => remove(draft.options[lastIndex]?.key ?? "")}
            >
              <XIcon data-icon="inline-start" />
              Remove the last choice
            </Button>
          ) : null}
        </div>
      )}
      <FieldError>{problems.options ?? problems.employer}</FieldError>
    </FieldSet>
  );
}
