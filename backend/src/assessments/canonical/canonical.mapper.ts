import { CANONICAL_FORMAT } from './canonical.types';
import type {
  CanonicalAssessment,
  CanonicalOption,
  CanonicalQuestion,
} from './canonical.types';
import { questionName } from './document-rules';
import { normalizeQuestion, questionProblems } from './question-rules';
import type { AssessmentWithContent } from './snapshot';

type ContentQuestion = AssessmentWithContent['questions'][number];

/** "Written communication" → "written-communication". */
export function slugify(text: string, fallback = 'item'): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
  return slug || fallback;
}

/** Section id → a key made from its name, unique within the test. */
export function sectionKeys(
  sections: readonly { id: string; name: string }[],
): Map<string, string> {
  const used = new Set<string>();
  const keys = new Map<string, string>();
  for (const section of sections) {
    const base = slugify(section.name, 'section');
    let key = base;
    for (let n = 2; used.has(key); n++) key = `${base}-${n}`;
    used.add(key);
    keys.set(section.id, key);
  }
  return keys;
}

export function toCanonicalQuestion(
  question: ContentQuestion,
  section: string | null,
): CanonicalQuestion {
  return {
    ref: question.ref,
    section,
    type: question.type,
    difficulty: question.difficulty,
    instruction: question.instruction,
    context: question.context,
    stem: question.stem,
    media: question.media
      ? { file: question.media.originalName, assetId: question.media.id }
      : question.mediaFileName
        ? { file: question.mediaFileName }
        : null,
    options: question.options.map((option): CanonicalOption => ({
      label: option.label,
      text: option.text,
      employerText: option.employerText,
      value: option.value,
      correct: option.isCorrect,
    })),
    rationale: question.rationale,
    transcript: question.transcript,
    shuffleOptions: question.shuffleOptions,
    keepLastOptionFixed: question.keepLastOptionFixed,
    employerPrompt: question.employerPrompt,
    employerValue: question.defaultEmployerValue,
  };
}

/** The whole test in the canonical format, for export and duplication. */
export function toCanonicalAssessment(
  assessment: AssessmentWithContent,
): CanonicalAssessment {
  const keys = sectionKeys(assessment.sections);
  return {
    format: CANONICAL_FORMAT,
    slug: assessment.slug,
    name: assessment.name,
    tagline: assessment.tagline,
    description: assessment.description,
    level: assessment.level,
    relevantFor: assessment.relevantFor,
    instructions: assessment.instructions,
    durationMinutes: assessment.durationMinutes,
    scoringMethod: assessment.scoringMethod,
    questionOrder: assessment.questionOrder,
    shuffleOptions: assessment.shuffleOptions,
    allowBackNavigation: assessment.allowBackNavigation,
    audioReplays: assessment.audioReplays,
    sections: assessment.sections.map((section) => ({
      key: keys.get(section.id) ?? slugify(section.name, 'section'),
      name: section.name,
      description: section.description,
      weight: section.weight,
    })),
    bands: [...assessment.bands]
      .sort((a, b) => b.minScore - a.minScore)
      .map((band) => ({
        minScore: band.minScore,
        label: band.label,
        interpretation: band.interpretation,
        recommendedAction: band.recommendedAction,
      })),
    questions: assessment.questions.map((question) =>
      toCanonicalQuestion(
        question,
        question.sectionId ? (keys.get(question.sectionId) ?? null) : null,
      ),
    ),
  };
}

/**
 * Everything that stops a test from being published or sent, as sentences.
 * Empty when it's ready.
 */
export function publishProblems(assessment: AssessmentWithContent): string[] {
  const problems: string[] = [];
  if (assessment.questions.length === 0)
    problems.push('Add at least one question.');

  assessment.questions.forEach((question, index) => {
    const name = questionName(index, question.ref);
    const canonical = normalizeQuestion(toCanonicalQuestion(question, null));
    for (const problem of questionProblems(
      canonical,
      assessment.scoringMethod,
    )) {
      problems.push(`${name}: ${problem}`);
    }
    if (!question.mediaId && question.mediaFileName) {
      problems.push(
        `${name}: upload the audio file "${question.mediaFileName}".`,
      );
    }
  });
  return problems;
}
