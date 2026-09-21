import type { AssessmentStatus } from "@/lib/api/assessments";
import type { InvitationListParams } from "@/lib/api/invitations";

/**
 * Every TanStack Query key, built by factories from general to specific
 * (docs/query-keys.md). Never write a key array inline in a component.
 */

export const assessmentKeys = {
  all: ["assessments"] as const,
  lists: () => [...assessmentKeys.all, "list"] as const,
  list: (filters: { status?: AssessmentStatus } = {}) => [...assessmentKeys.lists(), filters] as const,
  details: () => [...assessmentKeys.all, "detail"] as const,
  detail: (id: string) => [...assessmentKeys.details(), id] as const,
};

export const invitationKeys = {
  all: ["invitations"] as const,
  lists: () => [...invitationKeys.all, "list"] as const,
  list: (params: InvitationListParams) => [...invitationKeys.lists(), params] as const,
  details: () => [...invitationKeys.all, "detail"] as const,
  detail: (id: string) => [...invitationKeys.details(), id] as const,
};

export const candidateKeys = {
  all: ["candidates"] as const,
  search: (text: string) => [...candidateKeys.all, "search", text] as const,
};

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardKeys.all, "summary"] as const,
};

export const takeKeys = {
  all: ["take"] as const,
  overview: (token: string) => [...takeKeys.all, token, "overview"] as const,
};
