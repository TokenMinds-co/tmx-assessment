/**
 * Placeholder data, used until the API exists. Every name, count and score in
 * this file is invented, and every screen that shows it carries a "Sample
 * data" badge. Delete the file once real queries replace it (see
 * docs/dashboard.md).
 */
import type {
  AssessmentSummary,
  Pipeline,
  RecentResult,
} from "@/lib/dashboard-types";

export const SAMPLE_PIPELINE: Pipeline = {
  stages: [
    { id: "applied", name: "Applied", owner: "Nadia Putri" },
    { id: "form-review", name: "Form review", owner: "Nadia Putri" },
    { id: "screening-call", name: "Screening call", owner: "Kevin Hartono" },
    { id: "assessment", name: "Assessment", owner: "Kevin Hartono" },
    { id: "trial-day", name: "Trial day", owner: "Laura Chen" },
    { id: "offer", name: "Offer", owner: "Laura Chen" },
  ],
  roles: [
    {
      id: "frontend-developer",
      title: "Frontend Developer",
      candidatesByStage: {
        applied: 18,
        "form-review": 7,
        "screening-call": 4,
        assessment: 3,
        "trial-day": 1,
        offer: 0,
      },
    },
    {
      id: "content-writer",
      title: "Content Writer",
      candidatesByStage: {
        applied: 14,
        "form-review": 6,
        "screening-call": 3,
        assessment: 2,
        "trial-day": 1,
        offer: 1,
      },
    },
    {
      id: "seo-specialist",
      title: "SEO Specialist",
      candidatesByStage: {
        applied: 9,
        "form-review": 5,
        "screening-call": 3,
        assessment: 2,
        "trial-day": 0,
        offer: 0,
      },
    },
    {
      id: "project-manager",
      title: "Project Manager",
      candidatesByStage: {
        applied: 7,
        "form-review": 3,
        "screening-call": 2,
        assessment: 2,
        "trial-day": 1,
        offer: 1,
      },
    },
  ],
};

export const SAMPLE_ASSESSMENTS: AssessmentSummary = {
  progress: [
    { id: "not-started", label: "Not started", count: 3 },
    { id: "in-progress", label: "In progress", count: 2 },
    { id: "completed", label: "Completed", count: 14 },
  ],
  expired: 2,
  tests: [
    { id: "motivation", name: "Motivation", minutes: 15, completed: 9, averageScore: 74 },
    { id: "communication", name: "Communication", minutes: 20, completed: 7, averageScore: 68 },
    { id: "attention-to-detail", name: "Attention to detail", minutes: 15, completed: 6, averageScore: 61 },
    { id: "critical-thinking", name: "Critical thinking", minutes: 20, completed: 5, averageScore: 57 },
    { id: "english", name: "English", minutes: 15, completed: 8, averageScore: 79 },
  ],
};

export const SAMPLE_RECENT_RESULTS: RecentResult[] = [
  { id: "rina-wijaya", candidate: "Rina Wijaya", role: "Content Writer", tests: 2, score: 82, finishedAt: "2026-09-15T02:40:00Z" },
  { id: "daniel-okafor", candidate: "Daniel Okafor", role: "Frontend Developer", tests: 3, score: 71, finishedAt: "2026-09-14T09:15:00Z" },
  { id: "mei-lin-tan", candidate: "Mei Lin Tan", role: "Project Manager", tests: 2, score: 88, finishedAt: "2026-09-14T04:05:00Z" },
  { id: "arjun-mehta", candidate: "Arjun Mehta", role: "SEO Specialist", tests: 2, score: 64, finishedAt: "2026-09-13T07:30:00Z" },
  { id: "sofia-reyes", candidate: "Sofia Reyes", role: "Frontend Developer", tests: 3, score: 59, finishedAt: "2026-09-12T11:50:00Z" },
];
