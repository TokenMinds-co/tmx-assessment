import type {
  Difficulty,
  MediaRef,
  Question,
  QuestionInput,
  QuestionType,
  ScoringMethod,
} from "@/lib/api/assessments";

/*
 * A question as the editor holds it while someone types, and the checks the
 * API runs when it's saved (backend canonical/question-rules.ts), so problems
 * show before the round trip.
 */

export const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Single choice",
  TRUE_FALSE: "True or false",
  RATING_SCALE: "Rating scale",
  CHOICE_SCALE: "Choice scale",
};

export const TYPE_HINTS: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Two to six options, one right answer.",
  TRUE_FALSE: "A statement the candidate marks true or false.",
  RATING_SCALE: "A scale such as 1 to 5, labelled at the ends.",
  CHOICE_SCALE: "Two to six ordered choices, such as steady to fast-paced.",
};

/** A test holds right-answer types or scales, never both. */
export const TYPES_BY_METHOD: Record<ScoringMethod, QuestionType[]> = {
  CORRECT_ANSWER: ["SINGLE_CHOICE", "TRUE_FALSE"],
  ALIGNMENT: ["RATING_SCALE", "CHOICE_SCALE"],
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

export const LETTERS = ["A", "B", "C", "D", "E", "F"] as const;
export const MAX_CHOICES = LETTERS.length;
export const MIN_POINTS = 2;
export const MAX_POINTS = 7;
const DEFAULT_POINTS = 5;

export function isScaleType(type: QuestionType): boolean {
  return type === "RATING_SCALE" || type === "CHOICE_SCALE";
}

export interface OptionDraft {
  /** Stable while editing, for React keys: the saved option's id, or a made-up key. */
  key: string;
  id?: string;
  text: string;
  /** Scales: how the role profile words this point. */
  employerText: string;
  /** The saved scale value. Null for a new point; the scale is then numbered 1 to n. */
  value: number | null;
  isCorrect: boolean;
}

export interface QuestionDraft {
  sectionId: string | null;
  ref: string;
  type: QuestionType;
  difficulty: Difficulty | null;
  instruction: string;
  context: string;
  stem: string;
  media: MediaRef | null;
  /** A file an import named that hasn't been uploaded yet. */
  mediaFileName: string | null;
  options: OptionDraft[];
  rationale: string;
  transcript: string;
  shuffleOptions: boolean | null;
  keepLastOptionFixed: boolean;
  employerPrompt: string;
  /** Scales: the option the role profile picks. */
  employerKey: string | null;
}

export interface DraftProblems {
  type?: string;
  stem?: string;
  options?: string;
  employer?: string;
}

let lastKey = 0;

function blankOption(text = ""): OptionDraft {
  lastKey += 1;
  return { key: `new-${lastKey}`, text, employerText: "", value: null, isCorrect: false };
}

export function draftFromQuestion(question: Question): QuestionDraft {
  return {
    sectionId: question.sectionId,
    ref: question.ref ?? "",
    type: question.type,
    difficulty: question.difficulty,
    instruction: question.instruction ?? "",
    context: question.context ?? "",
    stem: question.stem,
    media: question.media,
    mediaFileName: question.mediaFileName,
    options: question.options.map((option) => ({
      key: option.id,
      id: option.id,
      text: option.text,
      employerText: option.employerText ?? "",
      value: option.value,
      isCorrect: option.isCorrect,
    })),
    rationale: question.rationale ?? "",
    transcript: question.transcript ?? "",
    shuffleOptions: question.shuffleOptions,
    keepLastOptionFixed: question.keepLastOptionFixed,
    employerPrompt: question.employerPrompt ?? "",
    employerKey:
      question.options.find((option) => option.value !== null && option.value === question.employerValue)?.id ??
      null,
  };
}

export function emptyDraft(method: ScoringMethod, sectionId: string | null): QuestionDraft {
  const type = TYPES_BY_METHOD[method][0] ?? "SINGLE_CHOICE";
  return {
    sectionId,
    ref: "",
    type,
    difficulty: null,
    instruction: "",
    context: "",
    stem: "",
    media: null,
    mediaFileName: null,
    options: optionsFor(type, []),
    rationale: "",
    transcript: "",
    shuffleOptions: null,
    keepLastOptionFixed: false,
    employerPrompt: "",
    employerKey: null,
  };
}

/** The options after the question's type changes, keeping the text that still fits. */
export function optionsFor(type: QuestionType, current: OptionDraft[]): OptionDraft[] {
  const written = current.filter((option) => option.text.trim());
  switch (type) {
    case "TRUE_FALSE":
      return ["True", "False"].map((text) => {
        const same = current.find((option) => option.text.trim().toLowerCase() === text.toLowerCase());
        return same ? { ...same, text, employerText: "", value: null } : blankOption(text);
      });
    case "SINGLE_CHOICE":
      return padTo(
        written.slice(0, MAX_CHOICES).map((option) => ({ ...option, employerText: "", value: null })),
        4,
      );
    case "CHOICE_SCALE":
      return padTo(
        written.slice(0, MAX_CHOICES).map((option) => ({ ...option, isCorrect: false, value: null })),
        3,
      );
    case "RATING_SCALE":
      return Array.from({ length: DEFAULT_POINTS }, () => blankOption());
  }
}

function padTo(options: OptionDraft[], length: number): OptionDraft[] {
  const padded = [...options];
  while (padded.length < length) padded.push(blankOption());
  return padded;
}

/** A blank option to add at the end. */
export function addedOption(): OptionDraft {
  return blankOption();
}

/** A rating scale with `size` points. The end labels stay at the ends. */
export function resizeScale(options: OptionDraft[], size: number): OptionDraft[] {
  const last = options.length > 1 ? options.at(-1) : undefined;
  return Array.from({ length: size }, (_, index) => {
    if (index === size - 1 && last) return { ...last, value: null };
    const kept = index < options.length - 1 ? options[index] : undefined;
    return kept ? { ...kept, value: null } : blankOption();
  });
}

/** The values a scale saves: the stored ones while they still climb, otherwise 1 to n. */
export function scaleValues(options: OptionDraft[]): number[] {
  const stored = options.map((option) => option.value);
  const climbing = stored.every(
    (value, index) =>
      value !== null && Number.isInteger(value) && (index === 0 || value > (stored[index - 1] ?? Infinity)),
  );
  return climbing ? stored.map((value, index) => value ?? index + 1) : options.map((_, index) => index + 1);
}

const blankToNull = (value: string) => value.trim() || null;

/** What the API receives when the question is saved. */
export function toInput(draft: QuestionDraft): QuestionInput {
  const scale = isScaleType(draft.type);
  const choice = draft.type === "SINGLE_CHOICE";
  const values = scaleValues(draft.options);
  const employerIndex = draft.options.findIndex((option) => option.key === draft.employerKey);

  return {
    sectionId: draft.sectionId,
    ref: blankToNull(draft.ref),
    type: draft.type,
    difficulty: draft.difficulty,
    instruction: blankToNull(draft.instruction),
    context: blankToNull(draft.context),
    stem: draft.stem.trim(),
    mediaId: draft.media?.id ?? null,
    mediaFileName: draft.media ? null : draft.mediaFileName,
    options: draft.options.map((option, index) => ({
      ...(option.id ? { id: option.id } : {}),
      text: option.text.trim(),
      employerText: scale ? blankToNull(option.employerText) : null,
      value: scale ? (values[index] ?? index + 1) : null,
      isCorrect: scale ? false : option.isCorrect,
    })),
    rationale: blankToNull(draft.rationale),
    transcript: blankToNull(draft.transcript),
    shuffleOptions: choice ? draft.shuffleOptions : null,
    keepLastOptionFixed: choice ? draft.keepLastOptionFixed : false,
    employerPrompt: scale ? blankToNull(draft.employerPrompt) : null,
    employerValue: scale && employerIndex >= 0 ? (values[employerIndex] ?? null) : null,
  };
}

/** Whether saving `draft` would change nothing. */
export function sameQuestion(a: QuestionDraft, b: QuestionDraft): boolean {
  return JSON.stringify(toInput(a)) === JSON.stringify(toInput(b));
}

/** What stops the question from saving, by the part of the form it belongs to. */
export function draftProblems(draft: QuestionDraft, method: ScoringMethod): DraftProblems {
  const problems: DraftProblems = {};
  if (!TYPES_BY_METHOD[method].includes(draft.type)) {
    problems.type =
      method === "ALIGNMENT"
        ? "This test compares answers with a role profile, so use a rating or choice scale."
        : "This test is scored by right answers, so use single choice or true or false.";
  }
  if (!draft.stem.trim()) problems.stem = "Write the question.";

  const blanks = draft.options.some((option) => !option.text.trim());
  const correct = draft.options.filter((option) => option.isCorrect).length;
  const employerPicked = draft.options.some((option) => option.key === draft.employerKey);

  switch (draft.type) {
    case "SINGLE_CHOICE":
      if (draft.options.length < 2) problems.options = "Add at least two options.";
      else if (blanks) problems.options = "Give every option some text, or remove the empty ones.";
      else if (correct !== 1) problems.options = "Mark the right answer.";
      break;
    case "TRUE_FALSE":
      if (correct !== 1) problems.options = "Mark whether the statement is true or false.";
      break;
    case "CHOICE_SCALE":
      if (draft.options.length < 2) problems.options = "Add at least two choices.";
      else if (blanks) problems.options = "Give every choice some text, or remove the empty ones.";
      if (!employerPicked) problems.employer = "Pick the answer that fits the role.";
      break;
    case "RATING_SCALE":
      if (!employerPicked) problems.employer = "Pick the answer that fits the role.";
      break;
  }
  return problems;
}

export function hasProblems(problems: DraftProblems): boolean {
  return Object.values(problems).some(Boolean);
}
