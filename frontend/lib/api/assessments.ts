import { apiFetch, apiUpload } from "@/lib/api/client";
import type { TakeQuestion, TakeSettings } from "@/lib/api/take";

/**
 * The test library endpoints (backend/docs/assessments.md). Staff only; the
 * candidate side is in lib/api/take.ts. Every change to a test answers with
 * the whole test, so callers put it straight into the query cache.
 */

export type AssessmentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
/** CORRECT_ANSWER: skills tests with right answers. ALIGNMENT: preferences compared with a role profile. */
export type ScoringMethod = "CORRECT_ANSWER" | "ALIGNMENT";
export type QuestionType = "SINGLE_CHOICE" | "TRUE_FALSE" | "RATING_SCALE" | "CHOICE_SCALE";
export type QuestionOrder = "FIXED" | "SHUFFLE_WITHIN_SECTION" | "SHUFFLE_ALL";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface AssessmentSummary {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  status: AssessmentStatus;
  scoringMethod: ScoringMethod;
  durationMinutes: number;
  questionCount: number;
  sectionCount: number;
  /** Questions waiting for an audio file. */
  missingMediaCount: number;
  sentCount: number;
  completedCount: number;
  /** Mean of completed attempts, from 0 to 1. */
  averageScore: number | null;
  updatedAt: string;
}

export interface MediaRef {
  id: string;
  url: string;
  mimeType: string;
  originalName: string;
}

export interface QuestionOption {
  id: string;
  order: number;
  label: string;
  text: string;
  employerText: string | null;
  value: number | null;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  order: number;
  sectionId: string | null;
  ref: string | null;
  type: QuestionType;
  difficulty: Difficulty | null;
  instruction: string | null;
  context: string | null;
  stem: string;
  media: MediaRef | null;
  /** A file an import named that hasn't been uploaded yet. */
  mediaFileName: string | null;
  employerPrompt: string | null;
  employerValue: number | null;
  rationale: string | null;
  transcript: string | null;
  shuffleOptions: boolean | null;
  keepLastOptionFixed: boolean;
  options: QuestionOption[];
}

export interface Section {
  id: string;
  order: number;
  name: string;
  description: string | null;
  weight: number | null;
  questionCount: number;
}

export interface ScoreBand {
  id: string;
  order: number;
  minScore: number;
  label: string;
  interpretation: string | null;
  recommendedAction: string | null;
}

export interface AssessmentDetail extends AssessmentSummary {
  description: string | null;
  level: string | null;
  relevantFor: string | null;
  instructions: string | null;
  questionOrder: QuestionOrder;
  shuffleOptions: boolean;
  allowBackNavigation: boolean;
  audioReplays: number;
  createdAt: string;
  sections: Section[];
  questions: Question[];
  /** Highest minimum first. */
  bands: ScoreBand[];
  /** What stops the test from being published or sent. Empty when it's ready. */
  problems: string[];
}

export interface CreateAssessmentInput {
  name: string;
  scoringMethod: ScoringMethod;
  durationMinutes?: number;
  tagline?: string;
}

export type UpdateAssessmentInput = Partial<
  Pick<
    AssessmentDetail,
    | "name"
    | "slug"
    | "tagline"
    | "description"
    | "level"
    | "relevantFor"
    | "instructions"
    | "durationMinutes"
    | "scoringMethod"
    | "status"
    | "questionOrder"
    | "shuffleOptions"
    | "allowBackNavigation"
    | "audioReplays"
  >
>;

export interface SectionInput {
  name?: string;
  description?: string | null;
  weight?: number | null;
}

export interface QuestionOptionInput {
  id?: string;
  text: string;
  employerText?: string | null;
  value?: number | null;
  isCorrect?: boolean;
}

export interface QuestionInput {
  sectionId: string | null;
  ref: string | null;
  type: QuestionType;
  difficulty: Difficulty | null;
  instruction: string | null;
  context: string | null;
  stem: string;
  mediaId: string | null;
  mediaFileName: string | null;
  options: QuestionOptionInput[];
  rationale: string | null;
  transcript: string | null;
  shuffleOptions: boolean | null;
  keepLastOptionFixed: boolean;
  employerPrompt: string | null;
  employerValue: number | null;
}

export interface BandInput {
  minScore: number;
  label: string;
  interpretation?: string | null;
  recommendedAction?: string | null;
}

export interface CsvIssue {
  /** The spreadsheet row; the header is row 1. Null for the whole file. */
  row: number | null;
  column: string | null;
  message: string;
}

export interface CsvPreviewRow {
  row: number;
  ref: string | null;
  section: string | null;
  type: QuestionType;
  stem: string;
  optionCount: number;
  correctLabel: string | null;
  media: string | null;
  mediaFound: boolean | null;
}

export type ImportMode = "append" | "replace";

export interface QuestionImportResult {
  dryRun: boolean;
  mode: ImportMode;
  rowCount: number;
  importedCount: number;
  newSections: string[];
  errors: CsvIssue[];
  warnings: CsvIssue[];
  preview: CsvPreviewRow[];
  assessment?: AssessmentDetail;
}

export interface AnswerKeyEntry {
  questionId: string;
  optionId: string;
  kind: "CORRECT" | "ROLE_PROFILE";
}

export interface AssessmentPreview {
  assessmentId: string;
  name: string;
  tagline: string | null;
  instructions: string | null;
  durationMinutes: number;
  status: AssessmentStatus;
  settings: TakeSettings;
  questions: TakeQuestion[];
  answerKey: AnswerKeyEntry[];
  problems: string[];
}

export interface SectionScore {
  sectionId: string | null;
  name: string;
  score: number;
  weight: number | null;
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
  gap: number;
  direction: "CANDIDATE_WANTS_MORE" | "ROLE_OFFERS_MORE";
}

export interface ScoreResult {
  score: number;
  bandLabel: string | null;
  correctCount: number | null;
  answeredCount: number;
  questionCount: number;
  sections: SectionScore[];
  flags: AlignmentFlag[];
}

const BASE = "/api/assessments";

export async function listAssessments(status?: AssessmentStatus): Promise<AssessmentSummary[]> {
  const { items } = await apiFetch<{ items: AssessmentSummary[] }>(
    status ? `${BASE}?status=${status}` : BASE,
  );
  return items;
}

export const getAssessment = (id: string) => apiFetch<AssessmentDetail>(`${BASE}/${id}`);

export const createAssessment = (input: CreateAssessmentInput) =>
  apiFetch<AssessmentDetail>(BASE, { method: "POST", body: input });

export const updateAssessment = (id: string, input: UpdateAssessmentInput) =>
  apiFetch<AssessmentDetail>(`${BASE}/${id}`, { method: "PATCH", body: input });

export const deleteAssessment = (id: string) =>
  apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });

export const duplicateAssessment = (id: string) =>
  apiFetch<AssessmentDetail>(`${BASE}/${id}/duplicate`, { method: "POST" });

/** Imports a test in the canonical JSON format that the export link downloads. */
export const importAssessment = (document: unknown) =>
  apiFetch<AssessmentDetail>(`${BASE}/import`, { method: "POST", body: document });

export const getPreview = (id: string) => apiFetch<AssessmentPreview>(`${BASE}/${id}/preview`);

/** What these answers would score. Nothing is saved. */
export const scorePreview = (id: string, answers: { questionId: string; optionId: string }[]) =>
  apiFetch<ScoreResult>(`${BASE}/${id}/preview/score`, { method: "POST", body: { answers } });

export const createSection = (id: string, input: SectionInput) =>
  apiFetch<AssessmentDetail>(`${BASE}/${id}/sections`, { method: "POST", body: input });

export const updateSection = (id: string, sectionId: string, input: SectionInput) =>
  apiFetch<AssessmentDetail>(`${BASE}/${id}/sections/${sectionId}`, {
    method: "PATCH",
    body: input,
  });

export const deleteSection = (id: string, sectionId: string) =>
  apiFetch<AssessmentDetail>(`${BASE}/${id}/sections/${sectionId}`, { method: "DELETE" });

export const reorderSections = (id: string, ids: string[]) =>
  apiFetch<AssessmentDetail>(`${BASE}/${id}/sections/order`, { method: "PUT", body: { ids } });

export const createQuestion = (id: string, input: QuestionInput) =>
  apiFetch<AssessmentDetail>(`${BASE}/${id}/questions`, { method: "POST", body: input });

export const updateQuestion = (id: string, questionId: string, input: QuestionInput) =>
  apiFetch<AssessmentDetail>(`${BASE}/${id}/questions/${questionId}`, {
    method: "PUT",
    body: input,
  });

export const duplicateQuestion = (id: string, questionId: string) =>
  apiFetch<AssessmentDetail>(`${BASE}/${id}/questions/${questionId}/duplicate`, {
    method: "POST",
  });

export const deleteQuestion = (id: string, questionId: string) =>
  apiFetch<AssessmentDetail>(`${BASE}/${id}/questions/${questionId}`, { method: "DELETE" });

export const reorderQuestions = (id: string, ids: string[]) =>
  apiFetch<AssessmentDetail>(`${BASE}/${id}/questions/order`, { method: "PUT", body: { ids } });

export const replaceBands = (id: string, bands: BandInput[]) =>
  apiFetch<AssessmentDetail>(`${BASE}/${id}/bands`, { method: "PUT", body: { bands } });

/** Checks (dryRun) or imports a question CSV. */
export function importQuestionsCsv(
  id: string,
  file: File,
  { mode, dryRun }: { mode: ImportMode; dryRun: boolean },
): Promise<QuestionImportResult> {
  const form = new FormData();
  form.append("file", file);
  return apiUpload<QuestionImportResult>(
    `${BASE}/${id}/questions/import?${new URLSearchParams({ mode, dryRun: String(dryRun) })}`,
    form,
  );
}

/** Download links. The browser saves them as files (the API sets Content-Disposition). */
export const exportJsonUrl = (id: string) => `${BASE}/${id}/export`;
export const exportCsvUrl = (id: string) => `${BASE}/${id}/questions/export.csv`;
export const csvTemplateUrl = (method: ScoringMethod) =>
  `${BASE}/csv-template?scoringMethod=${method}`;
