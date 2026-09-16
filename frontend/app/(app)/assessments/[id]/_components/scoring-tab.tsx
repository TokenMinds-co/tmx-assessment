"use client";

import { PlusIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { type AssessmentDetail, type BandInput, replaceBands, updateSection } from "@/lib/api/assessments";
import { cn } from "@/lib/utils";
import { SaveBar } from "./save-bar";
import { useAssessmentMutation } from "./use-assessment-mutation";

const MAX_BANDS = 10;
/** How much of `chart-1` each band gets over `primary-soft`: the lowest band is lightest. */
const MIN_MIX = 18;
const MAX_MIX = 100;
const bandFill = (mix: number) => `color-mix(in oklab, var(--chart-1) ${mix}%, var(--primary-soft))`;
const NO_BAND_STRIPES = "bg-[repeating-linear-gradient(135deg,var(--muted)_0_6px,var(--card)_6px_12px)]";

interface BandDraft {
  key: string;
  from: string;
  label: string;
  interpretation: string;
  recommendedAction: string;
}

/** "68.75" from 0.6875, without float noise such as 86.00000000000001. */
const percentText = (score: number) => String(Number((score * 100).toFixed(4)));

let lastBandKey = 0;
function newBand(from: string): BandDraft {
  lastBandKey += 1;
  return { key: `new-band-${lastBandKey}`, from, label: "", interpretation: "", recommendedAction: "" };
}

function bandDrafts(assessment: AssessmentDetail): BandDraft[] {
  return assessment.bands.map((band) => ({
    key: band.id,
    from: percentText(band.minScore),
    label: band.label,
    interpretation: band.interpretation ?? "",
    recommendedAction: band.recommendedAction ?? "",
  }));
}

function toInputs(drafts: BandDraft[]): BandInput[] {
  return drafts
    .map((draft) => ({
      minScore: Number(draft.from) / 100,
      label: draft.label.trim(),
      interpretation: draft.interpretation.trim() || null,
      recommendedAction: draft.recommendedAction.trim() || null,
    }))
    .sort((a, b) => b.minScore - a.minScore);
}

function bandErrors(drafts: BandDraft[]) {
  const errors = new Map<string, { from?: string; label?: string }>();
  const starts = new Set<number>();
  for (const draft of drafts) {
    const value = Number(draft.from);
    const error: { from?: string; label?: string } = {};
    if (!draft.from.trim() || !Number.isFinite(value) || value < 0 || value > 100) {
      error.from = "Use a number from 0 to 100.";
    } else if (starts.has(value)) {
      error.from = "Another band starts here.";
    }
    starts.add(value);
    if (!draft.label.trim()) error.label = "Name the band.";
    if (error.from || error.label) errors.set(draft.key, error);
  }
  return errors;
}

/** Score bands, and for questionnaires how much each section counts. */
export function ScoringTab({ assessment, isAdmin }: { assessment: AssessmentDetail; isAdmin: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <BandsForm assessment={assessment} isAdmin={isAdmin} />
      {assessment.scoringMethod === "ALIGNMENT" && assessment.sections.length > 0 ? (
        <WeightsForm assessment={assessment} isAdmin={isAdmin} />
      ) : null}
    </div>
  );
}

function BandsForm({ assessment, isAdmin }: { assessment: AssessmentDetail; isAdmin: boolean }) {
  const [drafts, setDrafts] = useState(() => bandDrafts(assessment));
  const [checked, setChecked] = useState(false);
  const save = useAssessmentMutation(assessment.id, (bands: BandInput[]) => replaceBands(assessment.id, bands));

  const errors = bandErrors(drafts);
  const dirty = JSON.stringify(toInputs(drafts)) !== JSON.stringify(toInputs(bandDrafts(assessment)));
  const starts = drafts.map((draft) => Number(draft.from)).filter((value) => Number.isFinite(value));
  const lowest = starts.length > 0 ? Math.min(...starts) : null;
  const edit = (key: string, patch: Partial<BandDraft>) =>
    setDrafts((current) => current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)));

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChecked(true);
    if (errors.size > 0) return;
    save.mutate(toInputs(drafts), {
      onSuccess: (detail) => {
        setDrafts(bandDrafts(detail));
        setChecked(false);
        toast.success("Score bands saved");
      },
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <section className="flex flex-col gap-5 rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-foreground">Score bands</h2>
          <p className="text-sm text-muted-foreground">
            {assessment.scoringMethod === "ALIGNMENT"
              ? "Name the ranges of the fit score. Results show the band a candidate lands in."
              : "Name the ranges of the score, the share of questions answered right. Results show the band a candidate lands in."}
          </p>
        </div>

        <BandBar drafts={drafts} />

        {lowest !== null && lowest > 0 ? (
          <Alert variant="warning">
            <TriangleAlertIcon />
            <AlertTitle>Scores under {lowest}% get no band. Add one that starts at 0%.</AlertTitle>
          </Alert>
        ) : null}

        <fieldset disabled={!isAdmin} className="flex min-w-0 flex-col gap-3">
          {drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bands yet. Results show only the percentage.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {drafts.map((draft, index) => {
                const error = checked ? errors.get(draft.key) : undefined;
                return (
                  <li key={draft.key} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[8rem_1fr_auto]">
                    <Field data-invalid={error?.from ? true : undefined}>
                      <FieldLabel htmlFor={`${draft.key}-from`}>From</FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          id={`${draft.key}-from`}
                          inputMode="decimal"
                          value={draft.from}
                          onChange={(event) => edit(draft.key, { from: event.target.value })}
                          aria-invalid={error?.from ? true : undefined}
                          className="tabular-nums"
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupText>%</InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                      <FieldError>{error?.from}</FieldError>
                    </Field>
                    <Field data-invalid={error?.label ? true : undefined}>
                      <FieldLabel htmlFor={`${draft.key}-label`}>Label</FieldLabel>
                      <Input
                        id={`${draft.key}-label`}
                        value={draft.label}
                        onChange={(event) => edit(draft.key, { label: event.target.value })}
                        placeholder="e.g. Competent"
                        aria-invalid={error?.label ? true : undefined}
                      />
                      <FieldError>{error?.label}</FieldError>
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="justify-self-end sm:mt-6"
                      onClick={() => setDrafts((current) => current.filter((item) => item.key !== draft.key))}
                      aria-label={`Remove band ${index + 1}`}
                    >
                      <XIcon />
                    </Button>
                    <div className="grid gap-3 sm:col-span-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor={`${draft.key}-meaning`}>What it means</FieldLabel>
                        <Textarea
                          id={`${draft.key}-meaning`}
                          value={draft.interpretation}
                          onChange={(event) => edit(draft.key, { interpretation: event.target.value })}
                          rows={2}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`${draft.key}-action`}>What to do next</FieldLabel>
                        <Textarea
                          id={`${draft.key}-action`}
                          value={draft.recommendedAction}
                          onChange={(event) => edit(draft.key, { recommendedAction: event.target.value })}
                          rows={2}
                        />
                      </Field>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {isAdmin && drafts.length < MAX_BANDS ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setDrafts((current) => [...current, newBand(current.length === 0 ? "0" : "")])}
            >
              <PlusIcon data-icon="inline-start" />
              Add band
            </Button>
          ) : null}
        </fieldset>
      </section>
      {isAdmin ? (
        <SaveBar
          show={dirty}
          saving={save.isPending}
          onDiscard={() => {
            setDrafts(bandDrafts(assessment));
            setChecked(false);
          }}
        />
      ) : null}
    </form>
  );
}

/**
 * The bands as one bar from 0 to 100%, so gaps show at a glance. The legend
 * below is its text twin, so no text sits on a chart color.
 */
function BandBar({ drafts }: { drafts: BandDraft[] }) {
  const bands = drafts
    .map((draft) => ({ key: draft.key, from: Number(draft.from), label: draft.label.trim() || "Unnamed band" }))
    .filter((band) => inRange(band.from))
    .sort((a, b) => a.from - b.from);
  if (bands.length === 0) return null;

  const first = bands[0]?.from ?? 0;
  const segments = bands.map((band, index) => ({
    ...band,
    to: bands[index + 1]?.from ?? 100,
    mix:
      bands.length === 1 ? MAX_MIX : Math.round(MIN_MIX + (index * (MAX_MIX - MIN_MIX)) / (bands.length - 1)),
  }));

  return (
    <figure className="flex flex-col gap-2">
      <div aria-hidden="true" className="flex h-7 w-full overflow-hidden rounded-lg border">
        {first > 0 ? <div style={{ width: `${first}%` }} className={NO_BAND_STRIPES} /> : null}
        {segments.map((segment, index) => (
          <div
            key={segment.key}
            style={{ width: `${segment.to - segment.from}%`, background: bandFill(segment.mix) }}
            className={cn("transition-[width] duration-300", (index > 0 || first > 0) && "border-l-2 border-card")}
          />
        ))}
      </div>
      <div aria-hidden="true" className="relative h-4 text-[11px] text-muted-foreground tabular-nums">
        {[...new Set([0, ...segments.map((segment) => segment.from), 100])].map((tick) => (
          <span
            key={tick}
            style={{ left: `${tick}%` }}
            className={cn(
              "absolute",
              tick === 0 ? "translate-x-0" : tick === 100 ? "-translate-x-full" : "-translate-x-1/2",
            )}
          >
            {tick}%
          </span>
        ))}
      </div>
      <figcaption>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          {[...segments].reverse().map((segment) => (
            <li key={segment.key} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-sm border"
                style={{ background: bandFill(segment.mix) }}
              />
              <span className="font-medium text-foreground">{segment.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {segment.from}–{segment.to}%
              </span>
            </li>
          ))}
          {first > 0 ? (
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className={cn("size-3 shrink-0 rounded-sm border", NO_BAND_STRIPES)} />
              <span className="font-medium text-foreground">No band</span>
              <span className="text-muted-foreground tabular-nums">0–{first}%</span>
            </li>
          ) : null}
        </ul>
      </figcaption>
    </figure>
  );
}

function inRange(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function WeightsForm({ assessment, isAdmin }: { assessment: AssessmentDetail; isAdmin: boolean }) {
  const initial = () =>
    Object.fromEntries(
      assessment.sections.map((section) => [section.id, section.weight === null ? "" : percentText(section.weight)]),
    );
  const [weights, setWeights] = useState<Record<string, string>>(initial);
  const save = useAssessmentMutation(assessment.id, async (changed: { id: string; weight: number | null }[]) => {
    let detail: AssessmentDetail | undefined;
    for (const item of changed) detail = await updateSection(assessment.id, item.id, { weight: item.weight });
    if (!detail) throw new Error("Nothing changed.");
    return detail;
  });

  const parsed = assessment.sections.map((section) => {
    const text = weights[section.id]?.trim() ?? "";
    const value = text === "" ? null : Number(text);
    return { section, text, value, valid: value === null || (Number.isFinite(value) && value >= 0 && value <= 100) };
  });
  const total = parsed.reduce((sum, row) => sum + (row.valid && row.value !== null ? row.value : 0), 0);
  const changed = parsed.filter(
    (row) => row.valid && (row.value === null ? null : row.value / 100) !== row.section.weight,
  );
  const invalid = parsed.some((row) => !row.valid);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (invalid || changed.length === 0) return;
        save.mutate(
          changed.map((row) => ({ id: row.section.id, weight: row.value === null ? null : row.value / 100 })),
          { onSuccess: () => toast.success("Weights saved") },
        );
      }}
      className="flex flex-col gap-4"
    >
      <section className="flex flex-col gap-5 rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-foreground">Section weights</h2>
          <p className="text-sm text-muted-foreground">
            How much each section counts towards the fit score. They don’t need to add up to 100: each counts in
            proportion to the total. A section without a weight doesn’t count, unless none has one.
          </p>
        </div>
        <fieldset disabled={!isAdmin} className="flex min-w-0 flex-col gap-2">
          {parsed.map((row) => {
            const share = row.valid && row.value !== null && total > 0 ? Math.round((row.value / total) * 100) : null;
            return (
              <Field
                key={row.section.id}
                orientation="horizontal"
                data-invalid={row.valid ? undefined : true}
                className="items-center rounded-lg border px-3 py-2"
              >
                <FieldLabel htmlFor={`weight-${row.section.id}`} className="min-w-0 flex-1">
                  {row.section.name}
                </FieldLabel>
                <span className="w-24 text-right text-xs text-muted-foreground tabular-nums">
                  {share !== null ? `${share}% of score` : total > 0 ? "Doesn’t count" : "Counts equally"}
                </span>
                <InputGroup className="w-28">
                  <InputGroupInput
                    id={`weight-${row.section.id}`}
                    inputMode="decimal"
                    value={row.text}
                    onChange={(event) => setWeights((current) => ({ ...current, [row.section.id]: event.target.value }))}
                    aria-invalid={row.valid ? undefined : true}
                    className="tabular-nums"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>%</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            );
          })}
          {invalid ? <FieldError>Use numbers from 0 to 100.</FieldError> : null}
        </fieldset>
      </section>
      {isAdmin ? (
        <SaveBar
          show={changed.length > 0 || invalid}
          saving={save.isPending}
          onDiscard={() => setWeights(initial())}
          message="Section weights have unsaved changes."
        />
      ) : null}
    </form>
  );
}
