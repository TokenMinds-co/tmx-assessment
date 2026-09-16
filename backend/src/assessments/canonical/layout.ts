import type { Prisma } from '../../generated/prisma/client';
import { QuestionOrder, ScoringMethod } from '../../generated/prisma/enums';
import type { AssessmentSnapshot, SnapshotQuestion } from './snapshot';

/**
 * The order one candidate sees: questions, and the options of each. It's
 * drawn once when the attempt starts and stored, so a refresh shows the same
 * order.
 */
export interface AttemptLayout {
  version: 1;
  questions: { questionId: string; optionIds: string[] }[];
}

/** Returns a number in [0, 1), like Math.random. */
export type Random = () => number;

/** A seeded random source, so tests get the same shuffle every time. */
export function mulberry32(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A shuffled copy (Fisher–Yates). */
export function shuffled<T>(items: readonly T[], random: Random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildLayout(
  snapshot: AssessmentSnapshot,
  random: Random = Math.random,
): AttemptLayout {
  return {
    version: 1,
    questions: orderQuestions(snapshot, random).map((question) => ({
      questionId: question.id,
      optionIds: orderOptions(question, random).map((option) => option.id),
    })),
  };
}

/** Reads a stored layout back, or null for an attempt that hasn't started. */
export function readLayout(
  value: Prisma.JsonValue | null,
): AttemptLayout | null {
  const layout = value as unknown as AttemptLayout | null;
  return layout?.version === 1 ? layout : null;
}

function orderQuestions(
  snapshot: AssessmentSnapshot,
  random: Random,
): SnapshotQuestion[] {
  let order = snapshot.questionOrder;
  // Motivation items are shuffled within their dimension, never across them.
  if (
    order === QuestionOrder.SHUFFLE_ALL &&
    snapshot.scoringMethod === ScoringMethod.ALIGNMENT
  ) {
    order = QuestionOrder.SHUFFLE_WITHIN_SECTION;
  }

  if (order === QuestionOrder.FIXED) return snapshot.questions;
  if (order === QuestionOrder.SHUFFLE_ALL)
    return shuffled(snapshot.questions, random);

  // Blocks in section order, then any questions without a section.
  const blocks = new Map<string | null, SnapshotQuestion[]>();
  for (const section of snapshot.sections) blocks.set(section.id, []);
  const unsectioned: SnapshotQuestion[] = [];
  for (const question of snapshot.questions) {
    const block =
      question.sectionId === null ? undefined : blocks.get(question.sectionId);
    (block ?? unsectioned).push(question);
  }
  return [...blocks.values(), unsectioned].flatMap((block) =>
    shuffled(block, random),
  );
}

function orderOptions(question: SnapshotQuestion, random: Random) {
  const { options } = question;
  if (!question.shuffleOptions) return options;
  if (question.keepLastOptionFixed && options.length > 1) {
    return [
      ...shuffled(options.slice(0, -1), random),
      options[options.length - 1],
    ];
  }
  return shuffled(options, random);
}
