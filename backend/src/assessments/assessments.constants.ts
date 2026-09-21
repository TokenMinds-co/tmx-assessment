/** Limits and timings for assessments. See docs/assessments.md. */

import { AttemptStatus } from '../generated/prisma/enums';

/**
 * An attempt is over once it was submitted or its time ran out. Shared, so the
 * test library and the dashboard can't disagree about what "completed" means.
 */
export const FINISHED_STATUSES: readonly AttemptStatus[] = [
  AttemptStatus.SUBMITTED,
  AttemptStatus.EXPIRED,
];

export const MAX_QUESTIONS = 100;
export const MAX_SECTIONS = 20;
export const MAX_BANDS = 10;
/** Tests in one invitation. Five 15-minute tests is already more than anyone should get. */
export const MAX_TESTS_PER_INVITATION = 5;

export const DEFAULT_EXPIRY_DAYS = 14;
export const MAX_EXPIRY_DAYS = 60;
/** Answers arriving this long after the deadline still count, to allow for a slow connection. */
export const DEADLINE_GRACE_MS = 30_000;

/** The largest question CSV accepted. A 100-question file is well under this. */
export const MAX_CSV_BYTES = 1024 * 1024;

/** Imports write many rows in one transaction; give them longer than Prisma's 5 s default. */
export const IMPORT_TRANSACTION_TIMEOUT_MS = 30_000;

export const TEXT_LIMITS = {
  name: 120,
  slug: 80,
  label: 200,
  option: 1000,
  stem: 2000,
  long: 10_000,
  message: 1000,
} as const;

export const INVALID_TAKE_LINK = 'This link is invalid or has expired.';

export const TAKE_LINK_EXPIRED =
  'This link has expired. Ask the person who sent it for a new one.';
export const ATTEMPT_NOT_FOUND = 'That test isn’t part of this link.';
export const ALREADY_FINISHED = 'You’ve already finished this test.';
export const NOT_STARTED_YET = 'Start the test before answering.';
export const TIME_UP =
  'Time’s up for this test, so it was submitted with the answers you gave.';
