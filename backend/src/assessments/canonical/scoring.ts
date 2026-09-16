import { QuestionType, ScoringMethod } from '../../generated/prisma/enums';
import { ALIGNMENT_FLAG_GAP } from './question-rules';
import type {
  AssessmentSnapshot,
  SnapshotBand,
  SnapshotOption,
  SnapshotQuestion,
} from './snapshot';

/** Question id to chosen option id. */
export type Answers = ReadonlyMap<string, string>;

export interface SectionScore {
  sectionId: string | null;
  name: string;
  /** From 0 to 1. */
  score: number;
  weight: number | null;
  /** CORRECT_ANSWER tests only. */
  correct: number | null;
  answered: number;
  total: number;
}

export interface AlignmentFlag {
  questionId: string;
  ref: string | null;
  stem: string;
  employerValue: number;
  candidateValue: number;
  /** Candidate minus employer. */
  gap: number;
  direction: 'CANDIDATE_WANTS_MORE' | 'ROLE_OFFERS_MORE';
}

export interface ScoreResult {
  /** From 0 to 1. */
  score: number;
  bandLabel: string | null;
  /** CORRECT_ANSWER tests only. */
  correctCount: number | null;
  answeredCount: number;
  questionCount: number;
  sections: SectionScore[];
  flags: AlignmentFlag[];
}

const UNSECTIONED_NAME = 'Other questions';
// Guards threshold checks against floating-point noise, such as 0.66 vs 0.6599999.
const EPSILON = 1e-9;

/** Scores an attempt from its snapshot. Unanswered questions score nothing. */
export function scoreAttempt(
  snapshot: AssessmentSnapshot,
  answers: Answers,
): ScoreResult {
  return snapshot.scoringMethod === ScoringMethod.ALIGNMENT
    ? scoreAlignment(snapshot, answers)
    : scoreCorrectAnswers(snapshot, answers);
}

/** The band with the highest minimum at or below the score. */
export function bandFor(
  bands: readonly SnapshotBand[],
  score: number,
): SnapshotBand | null {
  const highestFirst = [...bands].sort((a, b) => b.minScore - a.minScore);
  return highestFirst.find((band) => score + EPSILON >= band.minScore) ?? null;
}

/**
 * One point per correct answer; score = correct ÷ questions. Each section gets
 * its own score too, since a profile matters more than a total.
 */
export function scoreCorrectAnswers(
  snapshot: AssessmentSnapshot,
  answers: Answers,
): ScoreResult {
  let correctCount = 0;
  let answeredCount = 0;

  const sections = groups(snapshot).map((group): SectionScore => {
    let correct = 0;
    let answered = 0;
    for (const question of group.questions) {
      const option = chosenOption(question, answers);
      if (!option) continue;
      answered++;
      if (option.isCorrect) correct++;
    }
    correctCount += correct;
    answeredCount += answered;
    return {
      ...group.section,
      score: ratio(correct, group.questions.length),
      correct,
      answered,
      total: group.questions.length,
    };
  });

  const score = ratio(correctCount, snapshot.questions.length);
  return {
    score,
    bandLabel: bandFor(snapshot.bands, score)?.label ?? null,
    correctCount,
    answeredCount,
    questionCount: snapshot.questions.length,
    sections,
    flags: [],
  };
}

/**
 * How closely a candidate's answer matches the role profile: a rating scale
 * scores 1 − |E − C| ÷ (scale span), a choice scale 1 for the same choice, 0.5
 * for the one next to it and 0 otherwise.
 */
export function itemAlignment(
  question: SnapshotQuestion,
  candidateValue: number,
): number | null {
  const employerValue = question.employerValue;
  if (employerValue === null) return null;
  const gap = Math.abs(candidateValue - employerValue);

  if (question.type === QuestionType.CHOICE_SCALE) {
    return gap === 0 ? 1 : gap === 1 ? 0.5 : 0;
  }
  const values = question.options
    .map((option) => option.value)
    .filter((value): value is number => value !== null);
  const span = Math.max(...values) - Math.min(...values);
  return span > 0 ? Math.max(0, 1 - gap / span) : 1;
}

/**
 * The motivation model: each section (dimension) scores the mean alignment of
 * its answered items, and the overall score is the weighted mean of the
 * sections. Gaps of two points or more are flagged, with their direction.
 */
export function scoreAlignment(
  snapshot: AssessmentSnapshot,
  answers: Answers,
): ScoreResult {
  const flags: AlignmentFlag[] = [];
  let answeredCount = 0;

  const sections = groups(snapshot).map((group): SectionScore => {
    let total = 0;
    let answered = 0;
    for (const question of group.questions) {
      const option = chosenOption(question, answers);
      if (option?.value == null || question.employerValue === null) continue;
      const alignment = itemAlignment(question, option.value);
      if (alignment === null) continue;
      total += alignment;
      answered++;

      const gap = option.value - question.employerValue;
      if (Math.abs(gap) >= ALIGNMENT_FLAG_GAP) {
        flags.push({
          questionId: question.id,
          ref: question.ref,
          stem: question.stem,
          employerValue: question.employerValue,
          candidateValue: option.value,
          gap,
          direction: gap > 0 ? 'CANDIDATE_WANTS_MORE' : 'ROLE_OFFERS_MORE',
        });
      }
    }
    answeredCount += answered;
    return {
      ...group.section,
      score: answered > 0 ? total / answered : 0,
      correct: null,
      answered,
      total: group.questions.length,
    };
  });

  const weighted = sections.filter((section) => (section.weight ?? 0) > 0);
  const score =
    weighted.length > 0
      ? weighted.reduce((sum, s) => sum + (s.weight ?? 0) * s.score, 0) /
        weighted.reduce((sum, s) => sum + (s.weight ?? 0), 0)
      : sections.length > 0
        ? sections.reduce((sum, s) => sum + s.score, 0) / sections.length
        : 0;

  return {
    score,
    bandLabel: bandFor(snapshot.bands, score)?.label ?? null,
    correctCount: null,
    answeredCount,
    questionCount: snapshot.questions.length,
    sections,
    flags,
  };
}

interface Group {
  section: { sectionId: string | null; name: string; weight: number | null };
  questions: SnapshotQuestion[];
}

/** Questions by section, in section order, then any without a section. Empty groups are left out. */
function groups(snapshot: AssessmentSnapshot): Group[] {
  const bySection = new Map<string | null, Group>();
  for (const section of snapshot.sections) {
    bySection.set(section.id, {
      section: {
        sectionId: section.id,
        name: section.name,
        weight: section.weight,
      },
      questions: [],
    });
  }
  const unsectioned: Group = {
    section: { sectionId: null, name: UNSECTIONED_NAME, weight: null },
    questions: [],
  };
  for (const question of snapshot.questions) {
    const group =
      question.sectionId === null
        ? undefined
        : bySection.get(question.sectionId);
    (group ?? unsectioned).questions.push(question);
  }
  return [...bySection.values(), unsectioned].filter(
    (group) => group.questions.length > 0,
  );
}

function chosenOption(
  question: SnapshotQuestion,
  answers: Answers,
): SnapshotOption | null {
  const optionId = answers.get(question.id);
  if (!optionId) return null;
  return question.options.find((option) => option.id === optionId) ?? null;
}

function ratio(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}
