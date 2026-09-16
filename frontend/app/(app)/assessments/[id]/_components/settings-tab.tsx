"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  type AssessmentDetail,
  type QuestionOrder,
  type ScoringMethod,
  updateAssessment,
  type UpdateAssessmentInput,
} from "@/lib/api/assessments";
import { SaveBar } from "./save-bar";
import { useAssessmentMutation } from "./use-assessment-mutation";

interface SettingsDraft {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  level: string;
  relevantFor: string;
  instructions: string;
  durationMinutes: string;
  scoringMethod: ScoringMethod;
  questionOrder: QuestionOrder;
  shuffleOptions: boolean;
  allowBackNavigation: boolean;
  audioReplays: number;
}

type TextKey = "tagline" | "description" | "level" | "relevantFor" | "instructions";
const OPTIONAL_TEXT: TextKey[] = ["tagline", "description", "level", "relevantFor", "instructions"];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REPLAYS = [0, 1, 2, 3, 4, 5];

const ORDERS: { value: QuestionOrder; title: string; description: string }[] = [
  { value: "FIXED", title: "As listed", description: "Everyone gets the questions in the editor’s order." },
  {
    value: "SHUFFLE_WITHIN_SECTION",
    title: "Shuffled in each section",
    description: "Sections stay in order; the questions inside them are shuffled.",
  },
  {
    value: "SHUFFLE_ALL",
    title: "Shuffled",
    description: "Each candidate gets their own order. Questionnaires still keep each section together.",
  },
];

function draftFrom(assessment: AssessmentDetail): SettingsDraft {
  return {
    name: assessment.name,
    slug: assessment.slug,
    tagline: assessment.tagline ?? "",
    description: assessment.description ?? "",
    level: assessment.level ?? "",
    relevantFor: assessment.relevantFor ?? "",
    instructions: assessment.instructions ?? "",
    durationMinutes: String(assessment.durationMinutes),
    scoringMethod: assessment.scoringMethod,
    questionOrder: assessment.questionOrder,
    shuffleOptions: assessment.shuffleOptions,
    allowBackNavigation: assessment.allowBackNavigation,
    audioReplays: assessment.audioReplays,
  };
}

/** Only what changed, trimmed, with blanks sent as null. */
function changesFrom(draft: SettingsDraft, assessment: AssessmentDetail): UpdateAssessmentInput {
  const changes: UpdateAssessmentInput = {};
  if (draft.name.trim() !== assessment.name) changes.name = draft.name.trim();
  if (draft.slug.trim() !== assessment.slug) changes.slug = draft.slug.trim();
  for (const key of OPTIONAL_TEXT) {
    const value = draft[key].trim() || null;
    if (value !== assessment[key]) changes[key] = value;
  }
  const minutes = Number(draft.durationMinutes);
  if (minutes !== assessment.durationMinutes) changes.durationMinutes = minutes;
  if (draft.scoringMethod !== assessment.scoringMethod) changes.scoringMethod = draft.scoringMethod;
  if (draft.questionOrder !== assessment.questionOrder) changes.questionOrder = draft.questionOrder;
  if (draft.shuffleOptions !== assessment.shuffleOptions) changes.shuffleOptions = draft.shuffleOptions;
  if (draft.allowBackNavigation !== assessment.allowBackNavigation) {
    changes.allowBackNavigation = draft.allowBackNavigation;
  }
  if (draft.audioReplays !== assessment.audioReplays) changes.audioReplays = draft.audioReplays;
  return changes;
}

type SettingsErrors = ReturnType<typeof errorsFor>;

function errorsFor(draft: SettingsDraft) {
  const minutes = Number(draft.durationMinutes);
  return {
    name: draft.name.trim() ? undefined : "Give the test a name.",
    slug: SLUG.test(draft.slug.trim())
      ? undefined
      : "Use lowercase letters, numbers and single hyphens, like attention-to-detail.",
    durationMinutes:
      Number.isInteger(minutes) && minutes >= 1 && minutes <= 240
        ? undefined
        : "Use a whole number of minutes, from 1 to 240.",
  };
}

/** The test's name, what candidates read first, and how it's delivered. */
export function SettingsTab({ assessment, isAdmin }: { assessment: AssessmentDetail; isAdmin: boolean }) {
  const [draft, setDraft] = useState(() => draftFrom(assessment));
  const [checked, setChecked] = useState(false);
  const save = useAssessmentMutation(assessment.id, (input: UpdateAssessmentInput) =>
    updateAssessment(assessment.id, input),
  );

  const changes = changesFrom(draft, assessment);
  const dirty = Object.keys(changes).length > 0;
  const errors = errorsFor(draft);
  const shown: Partial<SettingsErrors> = checked ? errors : {};
  const patch = (next: Partial<SettingsDraft>) => setDraft((current) => ({ ...current, ...next }));
  const text = (key: keyof SettingsDraft) => ({
    value: String(draft[key]),
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => patch({ [key]: event.target.value }),
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChecked(true);
    if (errors.name || errors.slug || errors.durationMinutes) return;
    save.mutate(changes, {
      onSuccess: (detail) => {
        setDraft(draftFrom(detail));
        setChecked(false);
        toast.success("Settings saved");
      },
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <fieldset disabled={!isAdmin} className="flex min-w-0 flex-col gap-6">
        <Group title="About the test" description="How staff find it in the library and in results.">
          <Field data-invalid={shown.name ? true : undefined}>
            <FieldLabel htmlFor="settings-name">Name</FieldLabel>
            <Input id="settings-name" {...text("name")} aria-invalid={shown.name ? true : undefined} />
            <FieldError>{shown.name}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="settings-tagline">Tagline</FieldLabel>
            <Input id="settings-tagline" {...text("tagline")} placeholder="e.g. Reading, writing and listening at work" />
            <FieldDescription>One line, shown in the library and on the candidate’s list of tests.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="settings-description">What it measures</FieldLabel>
            <Textarea id="settings-description" {...text("description")} rows={3} />
            <FieldDescription>For staff.</FieldDescription>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="settings-level">Level</FieldLabel>
              <Input id="settings-level" {...text("level")} placeholder="e.g. Entry level" />
            </Field>
            <Field data-invalid={shown.slug ? true : undefined}>
              <FieldLabel htmlFor="settings-slug">Short name</FieldLabel>
              <Input
                id="settings-slug"
                {...text("slug")}
                spellCheck={false}
                autoCapitalize="none"
                aria-invalid={shown.slug ? true : undefined}
              />
              <FieldDescription>Used in export file names.</FieldDescription>
              <FieldError>{shown.slug}</FieldError>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="settings-relevant">Suits roles such as</FieldLabel>
            <Textarea id="settings-relevant" {...text("relevantFor")} rows={2} />
          </Field>
        </Group>

        <Group title="What candidates see" description="Before they start, and how long they have.">
          <Field>
            <FieldLabel htmlFor="settings-instructions">Instructions</FieldLabel>
            <Textarea id="settings-instructions" {...text("instructions")} rows={4} />
            <FieldDescription>Shown on the start screen. Leave it empty for the standard wording.</FieldDescription>
          </Field>
          <Field data-invalid={shown.durationMinutes ? true : undefined}>
            <FieldLabel htmlFor="settings-minutes">Time limit, in minutes</FieldLabel>
            <Input
              id="settings-minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={240}
              {...text("durationMinutes")}
              className="w-28"
              aria-invalid={shown.durationMinutes ? true : undefined}
            />
            <FieldError>{shown.durationMinutes}</FieldError>
          </Field>
        </Group>

        <Group title="Delivery" description="Order, shuffling and what candidates may do while they answer.">
          <FieldSet>
            <FieldLegend variant="label">Question order</FieldLegend>
            <RadioGroup
              value={draft.questionOrder}
              onValueChange={(value) => patch({ questionOrder: value as QuestionOrder })}
              className="grid gap-2 lg:grid-cols-3"
            >
              {ORDERS.map((order) => (
                <FieldLabel key={order.value} htmlFor={`order-${order.value}`}>
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>{order.title}</FieldTitle>
                      <FieldDescription>{order.description}</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem value={order.value} id={`order-${order.value}`} />
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
          </FieldSet>
          <Field orientation="horizontal">
            <Switch
              id="settings-shuffle"
              checked={draft.shuffleOptions}
              onCheckedChange={(shuffleOptions) => patch({ shuffleOptions })}
            />
            <FieldContent>
              <FieldLabel htmlFor="settings-shuffle">Shuffle answer options</FieldLabel>
              <FieldDescription>
                Single-choice options only. True or false and scales keep their order, and a question can opt out.
              </FieldDescription>
            </FieldContent>
          </Field>
          <Field orientation="horizontal">
            <Switch
              id="settings-back"
              checked={draft.allowBackNavigation}
              onCheckedChange={(allowBackNavigation) => patch({ allowBackNavigation })}
            />
            <FieldContent>
              <FieldLabel htmlFor="settings-back">Let candidates go back</FieldLabel>
              <FieldDescription>They can revisit and change earlier answers until they submit.</FieldDescription>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="settings-replays">Audio replays</FieldLabel>
            <Select
              value={String(draft.audioReplays)}
              onValueChange={(value) => patch({ audioReplays: Number(value) })}
            >
              <SelectTrigger id="settings-replays" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPLAYS.map((count) => (
                  <SelectItem key={count} value={String(count)}>
                    {count === 0 ? "No replays" : count === 1 ? "1 replay" : `${count} replays`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>How often a candidate can replay a clip after hearing it once.</FieldDescription>
          </Field>
        </Group>

        <Group title="Scoring" description="Change it only while the questions fit the new method.">
          <RadioGroup
            value={draft.scoringMethod}
            onValueChange={(value) => patch({ scoringMethod: value as ScoringMethod })}
            className="grid gap-2 lg:grid-cols-2"
            aria-label="How it’s scored"
          >
            <FieldLabel htmlFor="settings-method-correct">
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>Skills test</FieldTitle>
                  <FieldDescription>Every question has a right answer. Scored by how many are right.</FieldDescription>
                </FieldContent>
                <RadioGroupItem value="CORRECT_ANSWER" id="settings-method-correct" />
              </Field>
            </FieldLabel>
            <FieldLabel htmlFor="settings-method-alignment">
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>Preferences questionnaire</FieldTitle>
                  <FieldDescription>No right answers. Scored by how closely answers match the role profile.</FieldDescription>
                </FieldContent>
                <RadioGroupItem value="ALIGNMENT" id="settings-method-alignment" />
              </Field>
            </FieldLabel>
          </RadioGroup>
        </Group>
      </fieldset>

      {isAdmin ? (
        <SaveBar
          show={dirty}
          saving={save.isPending}
          onDiscard={() => {
            setDraft(draftFrom(assessment));
            setChecked(false);
          }}
        />
      ) : null}
    </form>
  );
}

function Group({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-xl border bg-card p-4 sm:p-6 lg:grid-cols-[14rem_1fr] lg:gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <FieldGroup className="gap-5">{children}</FieldGroup>
    </section>
  );
}
