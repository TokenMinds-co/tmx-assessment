import {
  QuestionOrder,
  QuestionType,
  ScoringMethod,
} from '../../generated/prisma/enums';
import type { CanonicalAssessment } from './canonical.types';
import { normalizeQuestion, shufflesOptions } from './question-rules';
import type {
  AssessmentSnapshot,
  SnapshotBand,
  SnapshotQuestion,
} from './snapshot';

/*
 * Builders for snapshots in unit tests. Kept out of the build by the
 * `**\/*.fixtures.ts` entry in tsconfig.build.json.
 */

export function choiceQuestion(
  id: string,
  sectionId: string | null,
  optionCount = 4,
  overrides: Partial<SnapshotQuestion> = {},
): SnapshotQuestion {
  return {
    id,
    ref: id,
    sectionId,
    type: QuestionType.SINGLE_CHOICE,
    instruction: null,
    context: null,
    stem: `Question ${id}`,
    media: null,
    employerPrompt: null,
    employerValue: null,
    difficulty: null,
    rationale: null,
    transcript: null,
    shuffleOptions: true,
    keepLastOptionFixed: false,
    // The first option is always the correct one.
    options: Array.from({ length: optionCount }, (_, index) => ({
      id: `${id}-o${index}`,
      label: 'ABCDEF'[index],
      text: `Option ${index}`,
      employerText: null,
      value: null,
      isCorrect: index === 0,
    })),
    ...overrides,
  };
}

export function scaleQuestion(
  id: string,
  sectionId: string | null,
  type: QuestionType,
  points: number,
  employerValue: number,
): SnapshotQuestion {
  return choiceQuestion(id, sectionId, 0, {
    type,
    employerValue,
    shuffleOptions: false,
    options: Array.from({ length: points }, (_, index) => ({
      id: `${id}-v${index + 1}`,
      label: String(index + 1),
      text: '',
      employerText: null,
      value: index + 1,
      isCorrect: false,
    })),
  });
}

export function snapshotOf(
  questions: SnapshotQuestion[],
  overrides: Partial<AssessmentSnapshot> = {},
): AssessmentSnapshot {
  return {
    version: 1,
    assessmentId: 'assessment',
    slug: 'test',
    name: 'Test',
    tagline: null,
    instructions: null,
    durationMinutes: 10,
    scoringMethod: ScoringMethod.CORRECT_ANSWER,
    questionOrder: QuestionOrder.FIXED,
    allowBackNavigation: true,
    audioReplays: 1,
    sections: [
      { id: 's1', name: 'Section one', weight: null },
      { id: 's2', name: 'Section two', weight: null },
    ],
    bands: [],
    questions,
    ...overrides,
  };
}

export function bands(...entries: [number, string][]): SnapshotBand[] {
  return entries.map(([minScore, label]) => ({
    minScore,
    label,
    interpretation: null,
    recommendedAction: null,
  }));
}

/** A snapshot from a canonical document, with made-up ids. For seed-file tests. */
export function snapshotFromCanonical(
  document: CanonicalAssessment,
): AssessmentSnapshot {
  const sectionIds = new Map<string, string>();
  const sections = document.sections.map((section, index) => {
    const id = `section-${index}`;
    sectionIds.set(section.key.toLowerCase(), id);
    sectionIds.set(section.name.toLowerCase(), id);
    return { id, name: section.name, weight: section.weight ?? null };
  });

  const questions = document.questions.map((raw, index): SnapshotQuestion => {
    const question = normalizeQuestion(raw);
    const id = `question-${index}`;
    return {
      id,
      ref: question.ref ?? null,
      sectionId: question.section
        ? (sectionIds.get(question.section.toLowerCase()) ?? null)
        : null,
      type: question.type,
      instruction: question.instruction ?? null,
      context: question.context ?? null,
      stem: question.stem,
      media: question.media?.file
        ? { id: `media-${index}`, mimeType: 'audio/mpeg' }
        : null,
      employerPrompt: question.employerPrompt ?? null,
      employerValue: question.employerValue ?? null,
      difficulty: question.difficulty ?? null,
      rationale: question.rationale ?? null,
      transcript: question.transcript ?? null,
      shuffleOptions: shufflesOptions(
        question.type,
        question.shuffleOptions,
        document.shuffleOptions,
      ),
      keepLastOptionFixed: Boolean(question.keepLastOptionFixed),
      options: question.options.map((option, optionIndex) => ({
        id: `${id}-option-${optionIndex}`,
        label: option.label ?? String(optionIndex + 1),
        text: option.text,
        employerText: option.employerText ?? null,
        value: option.value ?? null,
        isCorrect: Boolean(option.correct),
      })),
    };
  });

  return {
    version: 1,
    assessmentId: document.slug,
    slug: document.slug,
    name: document.name,
    tagline: document.tagline ?? null,
    instructions: document.instructions ?? null,
    durationMinutes: document.durationMinutes,
    scoringMethod: document.scoringMethod,
    questionOrder: document.questionOrder,
    allowBackNavigation: document.allowBackNavigation,
    audioReplays: document.audioReplays,
    sections,
    questions,
    bands: bands(
      ...document.bands.map((band): [number, string] => [
        band.minScore,
        band.label,
      ]),
    ),
  };
}
