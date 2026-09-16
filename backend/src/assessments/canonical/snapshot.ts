import { Prisma } from '../../generated/prisma/client';
import type {
  Difficulty,
  QuestionOrder,
  QuestionType,
  ScoringMethod,
} from '../../generated/prisma/enums';
import { shufflesOptions } from './question-rules';

/**
 * A test frozen at the moment it was sent, keys and role profile included.
 * Each attempt stores one, so later edits to the template never change a test
 * a candidate already has, and scoring reads only this. See docs/assessments.md.
 */
export interface AssessmentSnapshot {
  version: 1;
  assessmentId: string;
  slug: string;
  name: string;
  tagline: string | null;
  instructions: string | null;
  durationMinutes: number;
  scoringMethod: ScoringMethod;
  questionOrder: QuestionOrder;
  allowBackNavigation: boolean;
  audioReplays: number;
  sections: SnapshotSection[];
  questions: SnapshotQuestion[];
  /** Highest minScore first. */
  bands: SnapshotBand[];
}

export interface SnapshotSection {
  id: string;
  name: string;
  weight: number | null;
}

export interface SnapshotQuestion {
  id: string;
  ref: string | null;
  sectionId: string | null;
  type: QuestionType;
  instruction: string | null;
  context: string | null;
  stem: string;
  media: { id: string; mimeType: string } | null;
  employerPrompt: string | null;
  employerValue: number | null;
  difficulty: Difficulty | null;
  rationale: string | null;
  transcript: string | null;
  /** Already resolved from the question, the test and the question type. */
  shuffleOptions: boolean;
  keepLastOptionFixed: boolean;
  options: SnapshotOption[];
}

export interface SnapshotOption {
  id: string;
  label: string;
  text: string;
  employerText: string | null;
  value: number | null;
  isCorrect: boolean;
}

export interface SnapshotBand {
  minScore: number;
  label: string;
  interpretation: string | null;
  recommendedAction: string | null;
}

/** What to load with an assessment to snapshot, export or check it. */
export const assessmentContentInclude = {
  sections: { orderBy: { order: 'asc' } },
  questions: {
    orderBy: { order: 'asc' },
    include: { options: { orderBy: { order: 'asc' } }, media: true },
  },
  bands: { orderBy: { order: 'asc' } },
} satisfies Prisma.AssessmentInclude;

export type AssessmentWithContent = Prisma.AssessmentGetPayload<{
  include: typeof assessmentContentInclude;
}>;

export function buildSnapshot(
  assessment: AssessmentWithContent,
): AssessmentSnapshot {
  return {
    version: 1,
    assessmentId: assessment.id,
    slug: assessment.slug,
    name: assessment.name,
    tagline: assessment.tagline,
    instructions: assessment.instructions,
    durationMinutes: assessment.durationMinutes,
    scoringMethod: assessment.scoringMethod,
    questionOrder: assessment.questionOrder,
    allowBackNavigation: assessment.allowBackNavigation,
    audioReplays: assessment.audioReplays,
    sections: assessment.sections.map((section) => ({
      id: section.id,
      name: section.name,
      weight: section.weight,
    })),
    questions: assessment.questions.map((question) => ({
      id: question.id,
      ref: question.ref,
      sectionId: question.sectionId,
      type: question.type,
      instruction: question.instruction,
      context: question.context,
      stem: question.stem,
      media: question.media
        ? { id: question.media.id, mimeType: question.media.mimeType }
        : null,
      employerPrompt: question.employerPrompt,
      employerValue: question.defaultEmployerValue,
      difficulty: question.difficulty,
      rationale: question.rationale,
      transcript: question.transcript,
      shuffleOptions: shufflesOptions(
        question.type,
        question.shuffleOptions,
        assessment.shuffleOptions,
      ),
      keepLastOptionFixed: question.keepLastOptionFixed,
      options: question.options.map((option) => ({
        id: option.id,
        label: option.label,
        text: option.text,
        employerText: option.employerText,
        value: option.value,
        isCorrect: option.isCorrect,
      })),
    })),
    bands: [...assessment.bands]
      .sort((a, b) => b.minScore - a.minScore)
      .map((band) => ({
        minScore: band.minScore,
        label: band.label,
        interpretation: band.interpretation,
        recommendedAction: band.recommendedAction,
      })),
  };
}

/** Reads a stored snapshot back. Json columns come out untyped. */
export function readSnapshot(value: Prisma.JsonValue): AssessmentSnapshot {
  const snapshot = value as unknown as AssessmentSnapshot | null;
  if (snapshot?.version !== 1) {
    throw new Error('This attempt has a snapshot in an unknown format.');
  }
  return snapshot;
}

/** For writing typed values into Json columns. */
export function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
