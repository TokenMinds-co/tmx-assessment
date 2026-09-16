import { QuestionType, ScoringMethod } from '../../generated/prisma/enums';
import type { CanonicalOption, CanonicalQuestion } from './canonical.types';

export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export const MAX_CHOICE_OPTIONS = OPTION_LETTERS.length;
export const MIN_SCALE_POINTS = 2;
export const MAX_SCALE_POINTS = 7;
/** A gap this big between the candidate and the role profile is flagged for staff. */
export const ALIGNMENT_FLAG_GAP = 2;

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: 'Single choice',
  TRUE_FALSE: 'True/False',
  RATING_SCALE: 'Rating scale',
  CHOICE_SCALE: 'Choice scale',
};

const TYPES_BY_METHOD: Record<ScoringMethod, readonly QuestionType[]> = {
  CORRECT_ANSWER: [QuestionType.SINGLE_CHOICE, QuestionType.TRUE_FALSE],
  ALIGNMENT: [QuestionType.RATING_SCALE, QuestionType.CHOICE_SCALE],
};

/** The question types a test can hold: right-answer types or scales, never both. */
export function questionTypesFor(
  method: ScoringMethod,
): readonly QuestionType[] {
  return TYPES_BY_METHOD[method];
}

export function isScale(type: QuestionType): boolean {
  return (
    type === QuestionType.RATING_SCALE || type === QuestionType.CHOICE_SCALE
  );
}

/**
 * Whether a question's options are shuffled. Only single-choice options move:
 * True/False reads oddly reversed, and a shuffled scale makes no sense.
 */
export function shufflesOptions(
  type: QuestionType,
  questionSetting: boolean | null | undefined,
  testSetting: boolean,
): boolean {
  if (type !== QuestionType.SINGLE_CHOICE) return false;
  return questionSetting ?? testSetting;
}

/** Trimmed text, or null when there's nothing left. */
export function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

const TRUE_FALSE_OPTIONS: CanonicalOption[] = [
  { text: 'True' },
  { text: 'False' },
];

/**
 * Fills in what an author can leave out, such as option labels, scale values
 * and the True/False options, and trims every piece of text.
 */
export function normalizeQuestion(
  question: CanonicalQuestion,
): CanonicalQuestion {
  const scale = isScale(question.type);
  const source =
    question.type === QuestionType.TRUE_FALSE && question.options.length === 0
      ? TRUE_FALSE_OPTIONS
      : question.options;

  const options = source.map((option, index): CanonicalOption => {
    const value = scale ? (option.value ?? index + 1) : null;
    return {
      label: scale
        ? String(value)
        : (OPTION_LETTERS[index] ?? String(index + 1)),
      text: option.text.trim(),
      employerText: scale ? blankToNull(option.employerText) : null,
      value,
      correct: scale ? false : Boolean(option.correct),
    };
  });

  const file = blankToNull(question.media?.file);
  const assetId = blankToNull(question.media?.assetId);

  return {
    ref: blankToNull(question.ref),
    section: blankToNull(question.section),
    type: question.type,
    difficulty: question.difficulty ?? null,
    instruction: blankToNull(question.instruction),
    context: blankToNull(question.context),
    stem: question.stem.trim(),
    media: file || assetId ? { file, assetId } : null,
    options,
    rationale: blankToNull(question.rationale),
    transcript: blankToNull(question.transcript),
    shuffleOptions: question.shuffleOptions ?? null,
    keepLastOptionFixed: Boolean(question.keepLastOptionFixed),
    employerPrompt: scale ? blankToNull(question.employerPrompt) : null,
    employerValue: scale ? (question.employerValue ?? null) : null,
  };
}

/**
 * Everything wrong with a normalized question, as sentences for the author.
 * Empty when the question is ready to send.
 */
export function questionProblems(
  question: CanonicalQuestion,
  method: ScoringMethod,
): string[] {
  const problems: string[] = [];
  const { options, type } = question;
  const label = QUESTION_TYPE_LABELS[type];

  if (!question.stem) problems.push('Write the question.');
  if (!questionTypesFor(method).includes(type)) {
    problems.push(
      method === ScoringMethod.ALIGNMENT
        ? `${label} questions have a right answer, so they can't go in a test scored by alignment.`
        : `${label} questions have no right answer, so they can't go in a test scored by correct answers.`,
    );
  }

  const correct = options.filter((option) => option.correct).length;
  switch (type) {
    case QuestionType.SINGLE_CHOICE:
      if (options.length < 2) problems.push('Add at least two options.');
      if (options.length > MAX_CHOICE_OPTIONS) {
        problems.push(`Use at most ${MAX_CHOICE_OPTIONS} options.`);
      }
      if (options.some((option) => !option.text)) {
        problems.push('Give every option some text.');
      }
      if (correct !== 1) problems.push('Mark exactly one option as correct.');
      break;
    case QuestionType.TRUE_FALSE:
      if (options.length !== 2) {
        problems.push('A True/False question has exactly two options.');
      }
      if (correct !== 1) problems.push('Mark True or False as correct.');
      break;
    case QuestionType.RATING_SCALE:
    case QuestionType.CHOICE_SCALE: {
      const rating = type === QuestionType.RATING_SCALE;
      const max = rating ? MAX_SCALE_POINTS : MAX_CHOICE_OPTIONS;
      if (options.length < MIN_SCALE_POINTS || options.length > max) {
        problems.push(
          rating
            ? `A rating scale has ${MIN_SCALE_POINTS} to ${MAX_SCALE_POINTS} points.`
            : `Use ${MIN_SCALE_POINTS} to ${MAX_CHOICE_OPTIONS} choices.`,
        );
      }
      if (!rating && options.some((option) => !option.text)) {
        problems.push('Give every choice some text.');
      }
      const values = options.map((option) => option.value);
      const increasing = values.every(
        (value, index) =>
          typeof value === 'number' &&
          Number.isInteger(value) &&
          (index === 0 || value > (values[index - 1] ?? Infinity)),
      );
      if (!increasing) {
        problems.push(
          'Scale values must be whole numbers in increasing order.',
        );
      }
      if (
        question.employerValue == null ||
        !values.includes(question.employerValue)
      ) {
        problems.push(
          "Set the role profile's answer to one of the scale values.",
        );
      }
      break;
    }
  }
  return problems;
}
