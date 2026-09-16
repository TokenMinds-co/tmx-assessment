"use client";

import { ChevronDownIcon, CircleAlertIcon } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  type AssessmentDetail,
  createQuestion,
  type Difficulty,
  type Question,
  type QuestionInput,
  type QuestionType,
  updateQuestion,
} from "@/lib/api/assessments";
import { ApiError, errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { MediaField } from "./media-field";
import { OptionsEditor } from "./options-editor";
import {
  DIFFICULTY_LABELS,
  draftFromQuestion,
  draftProblems,
  emptyDraft,
  hasProblems,
  isScaleType,
  optionsFor,
  type QuestionDraft,
  sameQuestion,
  toInput,
  TYPE_HINTS,
  TYPE_LABELS,
  TYPES_BY_METHOD,
} from "./question-draft";
import { useAssessmentMutation } from "./use-assessment-mutation";

const NONE = "none";
const SHUFFLE = { inherit: "inherit", on: "on", off: "off" } as const;

const noSubscription = () => () => {};
/** ⌘ on Apple keyboards, Ctrl elsewhere. Only rendered in the browser, so no hydration mismatch. */
function useModifierKey(): string {
  return useSyncExternalStore(
    noSubscription,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"),
    () => "Ctrl",
  );
}

/**
 * Adds or edits one question. Nothing is saved until Save (or ⌘ Enter), and
 * the checks the API runs show inline first.
 */
export function QuestionForm({
  assessment,
  question,
  defaultSectionId = null,
  onDone,
}: {
  assessment: AssessmentDetail;
  /** Null adds a new question. */
  question: Question | null;
  defaultSectionId?: string | null;
  onDone: () => void;
}) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const modifier = useModifierKey();
  const method = assessment.scoringMethod;
  const [original] = useState(() =>
    question ? draftFromQuestion(question) : emptyDraft(method, defaultSectionId),
  );
  const [draft, setDraft] = useState(original);
  const [checked, setChecked] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const problems = draftProblems(draft, method);
  const shown = checked ? problems : {};
  const dirty = !sameQuestion(draft, original);
  const scale = isScaleType(draft.type);
  const choice = draft.type === "SINGLE_CHOICE";

  const save = useAssessmentMutation(
    assessment.id,
    (input: QuestionInput) =>
      question ? updateQuestion(assessment.id, question.id, input) : createQuestion(assessment.id, input),
    { toastErrors: false },
  );

  // Closing the tab with unsaved edits asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const patch = (changes: Partial<QuestionDraft>) => setDraft((current) => ({ ...current, ...changes }));

  function changeType(type: QuestionType) {
    setDraft((current) => {
      const options = optionsFor(type, current.options);
      const keep = options.some((option) => option.key === current.employerKey);
      return { ...current, type, options, employerKey: keep ? current.employerKey : null };
    });
  }

  function submit() {
    setChecked(true);
    if (hasProblems(problems)) {
      // After the errors render, put the cursor on the first one.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    if (question && !dirty) {
      onDone();
      return;
    }
    save.mutate(toInput(draft), {
      onSuccess: () => {
        toast.success(question ? "Question saved" : "Question added");
        onDone();
      },
    });
  }

  const serverErrors = save.error
    ? save.error instanceof ApiError
      ? save.error.messages
      : [errorMessage(save.error)]
    : [];
  const typeChoices = TYPES_BY_METHOD[method].includes(draft.type)
    ? TYPES_BY_METHOD[method]
    : [...TYPES_BY_METHOD[method], draft.type];
  const extrasFilled = [
    draft.instruction,
    draft.ref,
    draft.rationale,
    draft.transcript,
    draft.shuffleOptions === null ? "" : "set",
    draft.keepLastOptionFixed ? "set" : "",
  ].filter((value) => value.trim()).length;

  return (
    <form
      ref={formRef}
      noValidate
      aria-label={question ? "Edit question" : "New question"}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          submit();
        }
      }}
      className="flex flex-col gap-6"
    >
      <FieldGroup className="gap-5">
        <div className={cn("grid gap-4", scale ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
          <Field data-invalid={shown.type ? true : undefined}>
            <FieldLabel htmlFor={`${id}-type`}>Type</FieldLabel>
            <Select value={draft.type} onValueChange={(value) => changeType(value as QuestionType)}>
              <SelectTrigger id={`${id}-type`} className="w-full" aria-invalid={shown.type ? true : undefined}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeChoices.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>{TYPE_HINTS[draft.type]}</FieldDescription>
            <FieldError>{shown.type}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor={`${id}-section`}>Section</FieldLabel>
            <Select
              value={draft.sectionId ?? NONE}
              onValueChange={(value) => patch({ sectionId: value === NONE ? null : value })}
            >
              <SelectTrigger id={`${id}-section`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No section</SelectItem>
                {assessment.sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {scale ? null : (
            <Field>
              <FieldLabel htmlFor={`${id}-difficulty`}>Difficulty</FieldLabel>
              <Select
                value={draft.difficulty ?? NONE}
                onValueChange={(value) => patch({ difficulty: value === NONE ? null : (value as Difficulty) })}
              >
                <SelectTrigger id={`${id}-difficulty`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not set</SelectItem>
                  {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((level) => (
                    <SelectItem key={level} value={level}>
                      {DIFFICULTY_LABELS[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>

        <Field>
          <FieldLabel htmlFor={`${id}-context`}>Passage or scenario</FieldLabel>
          <Textarea
            id={`${id}-context`}
            value={draft.context}
            onChange={(event) => patch({ context: event.target.value })}
            rows={2}
            placeholder="Optional. An email, a short text or a situation the question is about."
          />
          <FieldDescription>Candidates see it above the question.</FieldDescription>
        </Field>

        <Field data-invalid={shown.stem ? true : undefined}>
          <FieldLabel htmlFor={`${id}-stem`}>{draft.type === "TRUE_FALSE" ? "Statement" : "Question"}</FieldLabel>
          <Textarea
            id={`${id}-stem`}
            value={draft.stem}
            onChange={(event) => patch({ stem: event.target.value })}
            rows={2}
            autoFocus={!question}
            placeholder={
              scale ? "e.g. How important is it to you that…" : "e.g. What is the main point of the message?"
            }
            aria-invalid={shown.stem ? true : undefined}
            className="text-base"
          />
          <FieldError>{shown.stem}</FieldError>
        </Field>

        {scale ? (
          <Field>
            <FieldLabel htmlFor={`${id}-employer-prompt`}>How the role profile asks it</FieldLabel>
            <Textarea
              id={`${id}-employer-prompt`}
              value={draft.employerPrompt}
              onChange={(event) => patch({ employerPrompt: event.target.value })}
              rows={2}
              placeholder="e.g. To what extent does this role need a variety of skills?"
            />
            <FieldDescription>Staff answer this version for the role. Candidates never see it.</FieldDescription>
          </Field>
        ) : null}

        {!scale || draft.media || draft.mediaFileName ? (
          <MediaField
            media={draft.media}
            fileName={draft.mediaFileName}
            onChange={(media, mediaFileName) => patch({ media, mediaFileName })}
          />
        ) : null}

        <OptionsEditor draft={draft} onChange={patch} problems={shown} idPrefix={id} />

        <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
              <ChevronDownIcon
                data-icon="inline-start"
                className={cn("transition-transform duration-200", moreOpen && "rotate-180")}
              />
              More settings
              {extrasFilled > 0 ? <span className="text-xs font-normal">({extrasFilled} set)</span> : null}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-5 pt-3">
            <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
              <Field>
                <FieldLabel htmlFor={`${id}-instruction`}>Instruction</FieldLabel>
                <Input
                  id={`${id}-instruction`}
                  value={draft.instruction}
                  onChange={(event) => patch({ instruction: event.target.value })}
                  placeholder="e.g. Listen to the clip, then answer."
                />
                <FieldDescription>A short line above the question.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-ref`}>Reference</FieldLabel>
                <Input
                  id={`${id}-ref`}
                  value={draft.ref}
                  onChange={(event) => patch({ ref: event.target.value })}
                  placeholder="e.g. Q5"
                  maxLength={40}
                />
                <FieldDescription>For staff, on results.</FieldDescription>
              </Field>
            </div>

            {choice ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`${id}-shuffle`}>Option order</FieldLabel>
                  <Select
                    value={draft.shuffleOptions === null ? SHUFFLE.inherit : draft.shuffleOptions ? SHUFFLE.on : SHUFFLE.off}
                    onValueChange={(value) =>
                      patch({ shuffleOptions: value === SHUFFLE.inherit ? null : value === SHUFFLE.on })
                    }
                  >
                    <SelectTrigger id={`${id}-shuffle`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SHUFFLE.inherit}>
                        As the test: {assessment.shuffleOptions ? "shuffled" : "in order"}
                      </SelectItem>
                      <SelectItem value={SHUFFLE.on}>Always shuffle</SelectItem>
                      <SelectItem value={SHUFFLE.off}>Keep in order</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldDescription>Keep in order for options such as “1, 2, 3, 4”.</FieldDescription>
                </Field>
                <Field orientation="horizontal" className="self-start sm:pt-7">
                  <Switch
                    id={`${id}-keep-last`}
                    checked={draft.keepLastOptionFixed}
                    onCheckedChange={(keepLastOptionFixed) => patch({ keepLastOptionFixed })}
                  />
                  <FieldContent>
                    <FieldLabel htmlFor={`${id}-keep-last`}>Keep the last option last</FieldLabel>
                    <FieldDescription>For “None of the above” and similar.</FieldDescription>
                  </FieldContent>
                </Field>
              </div>
            ) : null}

            <Field>
              <FieldLabel htmlFor={`${id}-rationale`}>
                {scale ? "Notes for staff" : "Why this is the right answer"}
              </FieldLabel>
              <Textarea
                id={`${id}-rationale`}
                value={draft.rationale}
                onChange={(event) => patch({ rationale: event.target.value })}
                rows={2}
              />
              <FieldDescription>Staff only. It shows with the results, never to candidates.</FieldDescription>
            </Field>

            {!scale || draft.transcript ? (
              <Field>
                <FieldLabel htmlFor={`${id}-transcript`}>Audio transcript</FieldLabel>
                <Textarea
                  id={`${id}-transcript`}
                  value={draft.transcript}
                  onChange={(event) => patch({ transcript: event.target.value })}
                  rows={2}
                />
                <FieldDescription>What the clip says. Staff only.</FieldDescription>
              </Field>
            ) : null}
          </CollapsibleContent>
        </Collapsible>

        {serverErrors.length > 0 ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>{serverErrors.length > 1 ? "The question wasn’t saved." : serverErrors[0]}</AlertTitle>
            {serverErrors.length > 1 ? (
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {serverErrors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </AlertDescription>
            ) : null}
          </Alert>
        ) : null}
      </FieldGroup>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <KbdGroup>
            <Kbd>{modifier}</Kbd>
            <Kbd>Enter</Kbd>
          </KbdGroup>
          saves
        </p>
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" onClick={onDone} disabled={save.isPending}>
            {dirty ? "Discard changes" : "Cancel"}
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? <Spinner data-icon="inline-start" /> : null}
            {question ? "Save question" : "Add question"}
          </Button>
        </div>
      </div>
    </form>
  );
}
