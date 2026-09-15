/**
 * What the dashboard cards render. The API client will map its responses to
 * these shapes; until it exists, lib/sample-data.ts fills them in.
 */

/** A recruitment stage. Stages are workspace data, so no component hardcodes them. */
export interface PipelineStage {
  id: string;
  name: string;
  /** The team member responsible for this stage. */
  owner: string;
}

export interface OpenRole {
  id: string;
  title: string;
  /** Candidates currently in each stage, keyed by stage id. */
  candidatesByStage: Record<string, number>;
}

export interface Pipeline {
  /** In pipeline order. */
  stages: PipelineStage[];
  roles: OpenRole[];
}

/** One step of test progress. Steps arrive in order, from not started to completed. */
export interface ProgressStep {
  id: string;
  label: string;
  count: number;
}

export interface TestSummary {
  id: string;
  name: string;
  /** Time limit in minutes. */
  minutes: number;
  /** Completed attempts. */
  completed: number;
  /** Mean score out of 100 across completed attempts. */
  averageScore: number;
}

export interface AssessmentSummary {
  /** Candidates who were sent tests, by how far they have got. */
  progress: ProgressStep[];
  /** Invitations that expired before the candidate started. */
  expired: number;
  tests: TestSummary[];
}

export interface RecentResult {
  id: string;
  candidate: string;
  role: string;
  /** Number of tests the candidate took. */
  tests: number;
  /** Mean score out of 100 across those tests. */
  score: number;
  /** ISO timestamp of the last test the candidate finished. */
  finishedAt: string;
}
