import { apiFetch } from "@/lib/api/client";
import type { PersonRef } from "@/lib/api/invitations";

/**
 * Everything the staff home page shows, in one call (docs/dashboard.md).
 * Read-only: nothing here is mutated from the app, so nothing invalidates it.
 */

/** Links sent to candidates, by how far the candidate has got. Expired links aren't counted here. */
export interface DashboardProgress {
  notStarted: number;
  inProgress: number;
  completed: number;
}

export interface DashboardTest {
  id: string;
  name: string;
  /** Time limit in minutes. */
  durationMinutes: number;
  /** Completed attempts. */
  completed: number;
  /** Mean of those attempts, from 0 to 1. Null until one is completed. */
  averageScore: number | null;
}

export interface DashboardResult {
  invitationId: string;
  candidate: PersonRef;
  /** Tests finished out of the tests the link carries. */
  testsFinished: number;
  testsTotal: number;
  /** Mean of the finished tests, from 0 to 1. Null when none scored. */
  averageScore: number | null;
  /** ISO timestamp of the last test the candidate finished. */
  finishedAt: string;
}

export interface Dashboard {
  progress: DashboardProgress;
  /** Links that expired with the candidate's tests unfinished. */
  expiredInvitations: number;
  tests: DashboardTest[];
  /** Newest first. */
  recentResults: DashboardResult[];
}

export const getDashboard = () => apiFetch<Dashboard>("/api/dashboard");
