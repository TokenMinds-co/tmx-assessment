import type { Prisma } from '../../generated/prisma/client';
import type { CanonicalOption, CanonicalQuestion } from './canonical.types';

export interface QuestionLinks {
  sectionId: string | null;
  mediaId: string | null;
  /** Kept only while there's no uploaded file. */
  mediaFileName: string | null;
}

/** A normalized question as the columns of `questions`, minus the test and position. */
export function questionFields(
  question: CanonicalQuestion,
  links: QuestionLinks,
) {
  return {
    sectionId: links.sectionId,
    ref: question.ref ?? null,
    type: question.type,
    instruction: question.instruction ?? null,
    context: question.context ?? null,
    stem: question.stem,
    mediaId: links.mediaId,
    mediaFileName: links.mediaId ? null : links.mediaFileName,
    employerPrompt: question.employerPrompt ?? null,
    defaultEmployerValue: question.employerValue ?? null,
    difficulty: question.difficulty ?? null,
    rationale: question.rationale ?? null,
    transcript: question.transcript ?? null,
    shuffleOptions: question.shuffleOptions ?? null,
    keepLastOptionFixed: Boolean(question.keepLastOptionFixed),
  } satisfies Omit<
    Prisma.QuestionUncheckedCreateInput,
    'assessmentId' | 'order'
  >;
}

/** A normalized option as the columns of `question_options`, minus the question. */
export function optionFields(option: CanonicalOption, order: number) {
  return {
    order,
    label: option.label ?? String(order + 1),
    text: option.text,
    employerText: option.employerText ?? null,
    value: option.value ?? null,
    isCorrect: Boolean(option.correct),
  } satisfies Omit<Prisma.QuestionOptionUncheckedCreateInput, 'questionId'>;
}
