import { apiFetch } from "@/lib/api/client";
import type { AlignmentFlag, QuestionType, ScoringMethod, SectionScore } from "@/lib/api/assessments";
import type { AttemptStatus } from "@/lib/api/take";

/** Sending tests to candidates and reading their results (backend/docs/assessments.md). */

export type InvitationStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "EXPIRED" | "REVOKED";

export interface PersonRef {
  id: string;
  name: string;
}

export interface CandidateRef extends PersonRef {
  email: string;
}

export interface AttemptSummary {
  id: string;
  assessmentId: string;
  name: string;
  status: AttemptStatus;
  score: number | null;
  bandLabel: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface InvitationSummary {
  id: string;
  candidate: CandidateRef;
  sentBy: PersonRef | null;
  status: InvitationStatus;
  createdAt: string;
  /** Null when the email failed. */
  sentAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  lastOpenedAt: string | null;
  attempts: AttemptSummary[];
}

export interface InvitationList {
  items: InvitationSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BandSummary {
  minScore: number;
  label: string;
  interpretation: string | null;
  recommendedAction: string | null;
}

export interface Choice {
  label: string;
  text: string;
}

export interface AnswerReview {
  questionId: string;
  number: number;
  ref: string | null;
  section: string | null;
  type: QuestionType;
  stem: string;
  chosen: Choice | null;
  /** The right answer, or the role profile's answer on a scale. */
  expected: Choice | null;
  isCorrect: boolean | null;
  candidateValue: number | null;
  employerValue: number | null;
}

export interface AttemptResult extends AttemptSummary {
  tagline: string | null;
  scoringMethod: ScoringMethod;
  durationMinutes: number;
  questionCount: number;
  answeredCount: number;
  deadlineAt: string | null;
  timeTakenSeconds: number | null;
  correctCount: number | null;
  band: BandSummary | null;
  sections: SectionScore[];
  flags: AlignmentFlag[];
  answers: AnswerReview[];
}

export interface InvitationDetail extends Omit<InvitationSummary, "attempts"> {
  message: string | null;
  attempts: AttemptResult[];
}

export interface SentInvitation {
  invitation: InvitationDetail;
  /** The candidate's link. Only its hash is stored, so this is the one chance to copy it. */
  link: string;
  emailSent: boolean;
}

export interface SendInvitationInput {
  candidateId?: string;
  candidate?: { name: string; email: string };
  assessmentIds: string[];
  expiresInDays?: number;
  message?: string;
}

export interface InvitationListParams {
  page: number;
  pageSize: number;
  search?: string;
  assessmentId?: string;
  candidateId?: string;
}

const BASE = "/api/assessment-invitations";

export const sendInvitation = (input: SendInvitationInput) =>
  apiFetch<SentInvitation>(BASE, { method: "POST", body: input });

export function listInvitations(params: InvitationListParams): Promise<InvitationList> {
  const query = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
  if (params.search) query.set("search", params.search);
  if (params.assessmentId) query.set("assessmentId", params.assessmentId);
  if (params.candidateId) query.set("candidateId", params.candidateId);
  return apiFetch<InvitationList>(`${BASE}?${query}`);
}

export const getInvitation = (id: string) => apiFetch<InvitationDetail>(`${BASE}/${id}`);

/** Emails a fresh link; the old one stops working. */
export const resendInvitation = (id: string, expiresInDays?: number) =>
  apiFetch<SentInvitation>(`${BASE}/${id}/resend`, {
    method: "POST",
    body: expiresInDays ? { expiresInDays } : {},
  });

export const revokeInvitation = (id: string) => apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
