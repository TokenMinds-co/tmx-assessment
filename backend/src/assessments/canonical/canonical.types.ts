import type {
  Difficulty,
  QuestionOrder,
  QuestionType,
  ScoringMethod,
} from '../../generated/prisma/enums';

/**
 * The canonical assessment format: one JSON document per test. The seed files
 * in seed/assessments/ use it, and so do JSON import and export. Question CSV
 * rows are converted to CanonicalQuestion. See docs/assessments.md.
 */
export const CANONICAL_FORMAT = 'tmx-assessment/1';

export interface CanonicalOption {
  /** Worked out from the position: A, B… or the scale value. */
  label?: string;
  text: string;
  /** ALIGNMENT tests: the employer's wording, when it differs. */
  employerText?: string | null;
  /** Scale position, for rating and choice scales. Defaults to 1, 2, 3… */
  value?: number | null;
  /** Choice questions: the right answer. */
  correct?: boolean;
}

export interface CanonicalMedia {
  /** The file name, matched against uploaded files. */
  file?: string | null;
  /** An uploaded file's id, when exporting and importing on the same server. */
  assetId?: string | null;
}

export interface CanonicalQuestion {
  ref?: string | null;
  /** A section key or name. */
  section?: string | null;
  type: QuestionType;
  difficulty?: Difficulty | null;
  instruction?: string | null;
  context?: string | null;
  stem: string;
  media?: CanonicalMedia | null;
  options: CanonicalOption[];
  rationale?: string | null;
  transcript?: string | null;
  /** Null or missing follows the test's setting. */
  shuffleOptions?: boolean | null;
  keepLastOptionFixed?: boolean;
  /** ALIGNMENT tests: the question as the employer reads it. */
  employerPrompt?: string | null;
  /** ALIGNMENT tests: the role profile's answer, as an option value. */
  employerValue?: number | null;
}

export interface CanonicalSection {
  /** How questions refer to this section. */
  key: string;
  name: string;
  description?: string | null;
  weight?: number | null;
}

export interface CanonicalBand {
  /** From 0 to 1. */
  minScore: number;
  label: string;
  interpretation?: string | null;
  recommendedAction?: string | null;
}

export interface CanonicalAssessment {
  format: typeof CANONICAL_FORMAT;
  slug: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  level?: string | null;
  relevantFor?: string | null;
  instructions?: string | null;
  durationMinutes: number;
  scoringMethod: ScoringMethod;
  questionOrder: QuestionOrder;
  shuffleOptions: boolean;
  allowBackNavigation: boolean;
  audioReplays: number;
  sections: CanonicalSection[];
  bands: CanonicalBand[];
  questions: CanonicalQuestion[];
}
