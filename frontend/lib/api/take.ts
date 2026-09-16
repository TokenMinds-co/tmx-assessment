import { ApiError, apiFetch } from "@/lib/api/client";
import type { QuestionType, ScoringMethod } from "@/lib/api/assessments";

/**
 * The candidate endpoints. There's no session: the token from the emailed
 * link is the access (backend/docs/assessments.md). The API never sends
 * answer keys, notes or the role profile here.
 */

export type AttemptStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";

export interface TakeOption {
  id: string;
  /** Can be empty for the middle points of a scale. */
  text: string;
}

export interface TakeQuestion {
  id: string;
  /** Position in this attempt, from 1. */
  number: number;
  type: QuestionType;
  instruction: string | null;
  context: string | null;
  stem: string;
  media: { url: string; mimeType: string } | null;
  /** In the order to show them. */
  options: TakeOption[];
}

export interface TakeSettings {
  allowBackNavigation: boolean;
  /** Replays allowed after the first play of each clip. */
  audioReplays: number;
  scoringMethod: ScoringMethod;
}

export interface TakeAnswer {
  questionId: string;
  optionId: string;
}

export interface TakeAttempt {
  id: string;
  status: AttemptStatus;
  name: string;
  instructions: string | null;
  durationMinutes: number;
  startedAt: string | null;
  deadlineAt: string | null;
  serverNow: string;
  settings: TakeSettings;
  questions: TakeQuestion[];
  answers: TakeAnswer[];
}

export interface TakeOverviewAttempt {
  id: string;
  name: string;
  tagline: string | null;
  instructions: string | null;
  durationMinutes: number;
  questionCount: number;
  hasAudio: boolean;
  settings: TakeSettings;
  status: AttemptStatus;
  deadlineAt: string | null;
}

export interface TakeOverview {
  candidateName: string;
  sentByName: string | null;
  message: string | null;
  expiresAt: string;
  serverNow: string;
  attempts: TakeOverviewAttempt[];
}

const path = (token: string, rest = "") => `/api/take/${encodeURIComponent(token)}${rest}`;

export const getTakeOverview = (token: string) =>
  apiFetch<TakeOverview>(path(token), { cache: "no-store" });

/** Starts the clock the first time; later calls resume with the saved answers. */
export const startAttempt = (token: string, attemptId: string) =>
  apiFetch<TakeAttempt>(path(token, `/attempts/${attemptId}/start`), { method: "POST" });

export const saveAnswer = (token: string, attemptId: string, questionId: string, optionId: string) =>
  apiFetch<void>(path(token, `/attempts/${attemptId}/answers/${questionId}`), {
    method: "PUT",
    body: { optionId },
  });

export const submitAttempt = (token: string, attemptId: string) =>
  apiFetch<{ status: AttemptStatus }>(path(token, `/attempts/${attemptId}/submit`), {
    method: "POST",
  });

/** Unknown or revoked link. */
export const isInvalidLink = (error: unknown) => error instanceof ApiError && error.status === 404;
/** The link expired. */
export const isExpiredLink = (error: unknown) => error instanceof ApiError && error.status === 410;
/** The API refused an answer or a submit because the time limit had passed. */
export const isTimeUp = (error: unknown) =>
  error instanceof ApiError && error.status === 409 && /time/i.test(error.message);
