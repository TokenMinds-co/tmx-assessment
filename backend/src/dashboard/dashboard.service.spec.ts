import { AttemptStatus } from '../generated/prisma/enums';
import { countLinks, type LinkCounts, type LinkRow } from './dashboard.service';

const NOW = Date.parse('2026-09-21T12:00:00.000Z');
const DAY_MS = 86_400_000;
const OPEN = new Date(NOW + DAY_MS);
const RAN_OUT = new Date(NOW - DAY_MS);

const link = (
  expiresAt: Date,
  statuses: AttemptStatus[],
  revokedAt: Date | null = null,
): LinkRow => ({
  revokedAt,
  expiresAt,
  attempts: statuses.map((status) => ({ status })),
});

/** Where a link should land. `nowhere` means it's counted in no number at all. */
type Bucket = 'notStarted' | 'inProgress' | 'completed' | 'expired' | 'nowhere';

const only = (bucket: Bucket): LinkCounts => ({
  progress: {
    notStarted: bucket === 'notStarted' ? 1 : 0,
    inProgress: bucket === 'inProgress' ? 1 : 0,
    completed: bucket === 'completed' ? 1 : 0,
  },
  expiredInvitations: bucket === 'expired' ? 1 : 0,
});

const CASES: [name: string, row: LinkRow, bucket: Bucket][] = [
  [
    'a revoked link, whatever its tests say',
    link(OPEN, [AttemptStatus.SUBMITTED], RAN_OUT),
    'nowhere',
  ],
  ['a link with no tests on it', link(OPEN, []), 'notStarted'],
  ['an untouched link', link(OPEN, [AttemptStatus.NOT_STARTED]), 'notStarted'],
  [
    'an open link with a test under way',
    link(OPEN, [AttemptStatus.IN_PROGRESS, AttemptStatus.NOT_STARTED]),
    'inProgress',
  ],
  [
    'a link where every test is finished',
    link(OPEN, [AttemptStatus.SUBMITTED, AttemptStatus.EXPIRED]),
    'completed',
  ],
  [
    'a link past its expiry with a test still running',
    link(RAN_OUT, [AttemptStatus.IN_PROGRESS]),
    'inProgress',
  ],
  [
    'a link past its expiry with a test never opened',
    link(RAN_OUT, [AttemptStatus.SUBMITTED, AttemptStatus.NOT_STARTED]),
    'expired',
  ],
];

describe('countLinks', () => {
  it.each(CASES)('counts %s', (_name, row, bucket) => {
    expect(countLinks([row], NOW)).toEqual(only(bucket));
  });

  it('counts nothing when there are no links', () => {
    expect(countLinks([], NOW)).toEqual({
      progress: { notStarted: 0, inProgress: 0, completed: 0 },
      expiredInvitations: 0,
    });
  });

  it('adds the whole table up', () => {
    expect(
      countLinks(
        CASES.map(([, row]) => row),
        NOW,
      ),
    ).toEqual({
      progress: { notStarted: 2, inProgress: 2, completed: 1 },
      expiredInvitations: 1,
    });
  });
});
