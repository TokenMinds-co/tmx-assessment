import type { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { UserRole } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import { type Agent, createStaff, signIn } from './utils/staff';
import { createTestApp } from './utils/test-app';

// Every candidate, test and account here carries the run's prefix and is
// deleted at the end. The dashboard counts the whole database, so the numbers
// that aren't scoped to this run's test are checked as differences.
const RUN = `e2e-${randomUUID().slice(0, 8)}`;
const emailFor = (label: string) => `${RUN}-${label}@example.test`;
const nameFor = (label: string) => `${RUN} ${label}`;

interface DashboardBody {
  progress: { notStarted: number; inProgress: number; completed: number };
  expiredInvitations: number;
  tests: {
    id: string;
    name: string;
    durationMinutes: number;
    completed: number;
    averageScore: number | null;
  }[];
  recentResults: {
    invitationId: string;
    candidate: { id: string; name: string };
    testsFinished: number;
    testsTotal: number;
    averageScore: number | null;
    finishedAt: string;
  }[];
}

interface AssessmentBody {
  id: string;
  questions: { id: string; options: { id: string; isCorrect: boolean }[] }[];
}

interface SentBody {
  link: string;
  invitation: { id: string; attempts: { id: string }[] };
}

interface Link {
  id: string;
  token: string;
  attemptId: string;
}

const bodyOf = <T>(res: request.Response): T => res.body as T;
const tokenOf = (link: string) => link.split('/take/')[1];

describe('The staff dashboard (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let admin: Agent;
  let member: Agent;
  let testId: string;
  /** One entry per question: the option that scores. */
  let key: { questionId: string; optionId: string }[];
  let before: DashboardBody;
  let after: DashboardBody;
  const links: Record<string, Link> = {};

  const http = () => request(app.getHttpServer());
  const take = (token: string, path = '') => `/api/take/${token}${path}`;

  const read = async (agent: Agent = admin) =>
    bodyOf<DashboardBody>(await agent.get('/api/dashboard').expect(200));

  /** A published two-question test, so this suite needs no audio and no seed. */
  async function buildTest(): Promise<void> {
    testId = bodyOf<AssessmentBody>(
      await admin
        .post('/api/assessments')
        .send({
          name: nameFor('Dashboard'),
          slug: `${RUN}-dashboard`,
          scoringMethod: 'CORRECT_ANSWER',
          durationMinutes: 5,
        })
        .expect(201),
    ).id;

    let detail: AssessmentBody | undefined;
    for (const stem of ['Pick the right one.', 'And again.']) {
      detail = bodyOf<AssessmentBody>(
        await admin
          .post(`/api/assessments/${testId}/questions`)
          .send({
            type: 'SINGLE_CHOICE',
            stem,
            options: [{ text: 'Right', isCorrect: true }, { text: 'Wrong' }],
          })
          .expect(201),
      );
    }
    key = (detail?.questions ?? []).map((question) => ({
      questionId: question.id,
      optionId: question.options.filter((option) => option.isCorrect)[0].id,
    }));

    await admin
      .patch(`/api/assessments/${testId}`)
      .send({ status: 'PUBLISHED' })
      .expect(200);
  }

  /** Sends the test to a candidate of this run, and keeps the link's ids. */
  async function send(label: string): Promise<Link> {
    const sent = bodyOf<SentBody>(
      await admin
        .post('/api/assessment-invitations')
        .send({
          candidate: { name: nameFor(label), email: emailFor(label) },
          assessmentIds: [testId],
        })
        .expect(201),
    );
    const link = {
      id: sent.invitation.id,
      token: tokenOf(sent.link),
      attemptId: sent.invitation.attempts[0].id,
    };
    links[label] = link;
    return link;
  }

  const start = (link: Link) =>
    http()
      .post(take(link.token, `/attempts/${link.attemptId}/start`))
      .expect(200);

  async function answerAndSubmit(link: Link, questions: number): Promise<void> {
    for (const { questionId, optionId } of key.slice(0, questions)) {
      await http()
        .put(
          take(link.token, `/attempts/${link.attemptId}/answers/${questionId}`),
        )
        .send({ optionId })
        .expect(204);
    }
    await http()
      .post(take(link.token, `/attempts/${link.attemptId}/submit`))
      .expect(200);
  }

  beforeAll(async () => {
    ({ app } = await createTestApp());
    prisma = app.get(PrismaService);
    admin = await signIn(
      app,
      await createStaff(app, emailFor('admin'), UserRole.ADMIN),
    );
    member = await signIn(app, await createStaff(app, emailFor('member')));
    await buildTest();

    before = await read();

    // A: sent and untouched. B: opened. C: one of two answered, then submitted.
    await send('a');
    await start(await send('b'));
    const c = await send('c');
    await start(c);
    await answerAndSubmit(c, 1);

    // D: nobody opened it in time.
    const d = await send('d');
    await prisma.assessmentInvitation.update({
      where: { id: d.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    // E: revoked before anyone opened it. F: finished, then revoked, which is
    // the newest finish of all and so would top the list if it counted.
    await admin
      .delete(`/api/assessment-invitations/${(await send('e')).id}`)
      .expect(204);
    const f = await send('f');
    await start(f);
    await answerAndSubmit(f, 2);
    await admin.delete(`/api/assessment-invitations/${f.id}`).expect(204);

    after = await read();
  });

  afterAll(async () => {
    await prisma.assessmentInvitation.deleteMany({
      where: { candidate: { email: { startsWith: RUN } } },
    });
    await prisma.candidate.deleteMany({
      where: { email: { startsWith: RUN } },
    });
    await prisma.assessment.deleteMany({
      where: { slug: { startsWith: RUN } },
    });
    await prisma.user.deleteMany({ where: { email: { startsWith: RUN } } });
    await app.close();
  });

  it('moves each link into one bucket, and counts revoked links nowhere', () => {
    expect(after.progress.notStarted - before.progress.notStarted).toBe(1);
    expect(after.progress.inProgress - before.progress.inProgress).toBe(1);
    expect(after.progress.completed - before.progress.completed).toBe(1);
    expect(after.expiredInvitations - before.expiredInvitations).toBe(1);
  });

  it('gives each sent test its own figures', () => {
    const row = after.tests.find((test) => test.id === testId);

    expect(row).toMatchObject({
      name: nameFor('Dashboard'),
      durationMinutes: 5,
      // C answered one of two questions, F answered both.
      completed: 2,
    });
    expect(row?.averageScore).toBeCloseTo(0.75, 6);
    expect(before.tests.some((test) => test.id === testId)).toBe(false);
  });

  it('lists the latest finished candidates, newest first, without revoked links', () => {
    const [newest] = after.recentResults;

    expect(newest).toMatchObject({
      invitationId: links.c.id,
      candidate: { name: nameFor('c') },
      testsFinished: 1,
      testsTotal: 1,
    });
    expect(newest.averageScore).toBeCloseTo(0.5, 6);
    // The page shows a name, so the candidate's email stays out of the answer.
    expect(Object.keys(newest.candidate).sort()).toEqual(['id', 'name']);

    expect(after.recentResults.length).toBeLessThanOrEqual(5);
    expect(
      after.recentResults.some((row) => row.invitationId === links.f.id),
    ).toBe(false);

    const times = after.recentResults.map((row) => Date.parse(row.finishedAt));
    expect(times).toEqual([...times].sort((one, two) => two - one));
  });

  it('needs a session, and any staff member can read it', async () => {
    await http().get('/api/dashboard').expect(401);
    await member.get('/api/dashboard').expect(200);
  });
});
