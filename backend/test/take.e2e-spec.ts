import type { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import request from 'supertest';
import type { AssessmentSnapshot } from '../src/assessments/canonical/snapshot';
import { UserRole } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  InMemoryMailTransport,
  takeTokenFrom,
} from './utils/in-memory-mail.transport';
import { type Agent, createStaff, signIn } from './utils/staff';
import { createTestApp } from './utils/test-app';

// Every candidate, test and account here carries the run's prefix and is
// deleted at the end.
const RUN = `e2e-${randomUUID().slice(0, 8)}`;
const emailFor = (label: string) => `${RUN}-${label}@example.test`;
const slugFor = (label: string) => `${RUN}-${label}`;
const SEED = join(__dirname, '../seed');

/** Keys that would give away answers, staff notes or the role profile. */
const PRIVATE_KEYS =
  /"(isCorrect|correct|rationale|transcript|employerPrompt|employerValue|employerText|sectionId|difficulty|ref|value)"/;

/** The candidate answers from the Motivation workbook's calculator example. */
const MOTIVATION_ANSWERS = [
  4, 3, 5, 3, 4, 4, 4, 5, 4, 4, 4, 3, 4, 4, 2, 5, 3, 3, 2, 3,
];

interface ErrorBody {
  message: string | string[];
}

interface AttemptResultBody {
  id: string;
  assessmentId: string;
  name: string;
  status: string;
  score: number | null;
  bandLabel: string | null;
  correctCount: number | null;
  answers: { isCorrect: boolean | null }[];
  flags: { ref: string | null; direction: string }[];
}

interface InvitationBody {
  id: string;
  status: string;
  candidate: { id: string; name: string; email: string };
  attempts: AttemptResultBody[];
}

interface SentBody {
  link: string;
  emailSent: boolean;
  invitation: InvitationBody;
}

interface OverviewBody {
  candidateName: string;
  attempts: {
    id: string;
    name: string;
    status: string;
    durationMinutes: number;
    questionCount: number;
  }[];
}

interface AttemptBody {
  id: string;
  status: string;
  deadlineAt: string;
  serverNow: string;
  questions: { id: string; options: { id: string }[] }[];
  answers: { questionId: string; optionId: string }[];
}

interface ListBody {
  items: { id: string; attempts: { assessmentId: string }[] }[];
  total: number;
  page: number;
  pageSize: number;
}

const bodyOf = <T>(res: request.Response): T => res.body as T;
const tokenOf = (link: string) => link.split('/take/')[1];

describe('Sending and taking assessments (e2e)', () => {
  let app: NestExpressApplication;
  let mail: InMemoryMailTransport;
  let prisma: PrismaService;
  let storageDir: string;
  let admin: Agent;
  let member: Agent;
  let communicationId: string;
  let motivationId: string;
  let draftId: string;

  const http = () => request(app.getHttpServer());
  const take = (token: string, path = '') => `/api/take/${token}${path}`;

  async function importPublished(file: string): Promise<string> {
    const document = {
      ...(JSON.parse(
        readFileSync(join(SEED, 'assessments', `${file}.json`), 'utf8'),
      ) as Record<string, unknown>),
      slug: slugFor(file),
    };
    const { id } = bodyOf<{ id: string }>(
      await admin.post('/api/assessments/import').send(document).expect(201),
    );
    await admin
      .patch(`/api/assessments/${id}`)
      .send({ status: 'PUBLISHED' })
      .expect(200);
    return id;
  }

  const send = (
    candidate: { name: string; email: string } | { id: string },
    assessmentIds: string[],
    extra: Record<string, unknown> = {},
    agent?: Agent,
  ) =>
    (agent ?? admin)
      .post('/api/assessment-invitations')
      .send(
        'id' in candidate
          ? { candidateId: candidate.id, assessmentIds, ...extra }
          : { candidate, assessmentIds, ...extra },
      );

  async function answerKey(assessmentId: string) {
    const res = await member
      .get(`/api/assessments/${assessmentId}/preview`)
      .expect(200);
    return bodyOf<{ answerKey: { questionId: string; optionId: string }[] }>(
      res,
    ).answerKey;
  }

  beforeAll(async () => {
    ({ app, mail, storageDir } = await createTestApp());
    prisma = app.get(PrismaService);
    admin = await signIn(
      app,
      await createStaff(app, emailFor('admin'), UserRole.ADMIN),
    );
    member = await signIn(app, await createStaff(app, emailFor('member')));

    // Upload the Communication test's clips first, so its questions find them by name.
    for (const file of ['communication_Q5.mp3', 'communication_Q6.mp3']) {
      await admin
        .post('/api/media')
        .attach('file', readFileSync(join(SEED, 'media', file)), file)
        .expect(201);
    }
    communicationId = await importPublished('communication');
    motivationId = await importPublished('motivation');
    draftId = bodyOf<{ id: string }>(
      await admin
        .post('/api/assessments')
        .send({
          name: `${RUN} Draft`,
          slug: slugFor('draft'),
          scoringMethod: 'CORRECT_ANSWER',
        })
        .expect(201),
    ).id;
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
    await prisma.mediaAsset.deleteMany({
      where: { uploadedBy: { email: { startsWith: RUN } } },
    });
    await prisma.user.deleteMany({ where: { email: { startsWith: RUN } } });
    await rm(storageDir, { recursive: true, force: true });
    await app.close();
  });

  beforeEach(() => mail.clear());

  it('sends two tests in one email, with one link', async () => {
    const sent = bodyOf<SentBody>(
      await send(
        { name: 'Ada Lovelace', email: emailFor('ada') },
        [communicationId, motivationId],
        {
          message: 'Good luck!',
        },
      ).expect(201),
    );

    expect(sent.emailSent).toBe(true);
    expect(sent.link).toMatch(/\/take\/[A-Za-z0-9_-]{43}$/);
    expect(sent.invitation).toMatchObject({
      status: 'NOT_STARTED',
      candidate: { name: 'Ada Lovelace', email: emailFor('ada') },
    });
    expect(sent.invitation.attempts.map((a) => a.name)).toEqual([
      'Communication',
      'Motivation',
    ]);

    const email = await mail.waitFor(emailFor('ada'), /assessments/);
    expect(takeTokenFrom(email)).toBe(tokenOf(sent.link));
    expect(email.text).toContain('Communication (8 min)');
    expect(email.text).toContain('Motivation (15 min)');
    expect(email.text).toContain('Good luck!');
  });

  it('reuses a known candidate, and refuses drafts and duplicates', async () => {
    const first = bodyOf<SentBody>(
      await send({ name: 'Bob', email: emailFor('bob') }, [
        communicationId,
      ]).expect(201),
    );
    const bob = { id: first.invitation.candidate.id };

    const draft = await send(bob, [draftId]).expect(400);
    expect(String(bodyOf<ErrorBody>(draft).message)).toMatch(/draft/);

    const again = await send(bob, [communicationId]).expect(409);
    expect(bodyOf<ErrorBody>(again).message).toMatch(/already has/);

    // Any staff member can send, but not someone signed out.
    await send(bob, [motivationId], {}, member).expect(201);
    await http()
      .post('/api/assessment-invitations')
      .send({ candidateId: bob.id, assessmentIds: [motivationId] })
      .expect(401);
  });

  it('lets a candidate take a test from the link, and scores it on submit', async () => {
    const sent = bodyOf<SentBody>(
      await send({ name: 'Cara', email: emailFor('cara') }, [
        communicationId,
      ]).expect(201),
    );
    const token = tokenOf(sent.link);

    const overview = bodyOf<OverviewBody>(
      await http().get(take(token)).expect(200),
    );
    expect(overview).toMatchObject({
      candidateName: 'Cara',
      attempts: [
        {
          name: 'Communication',
          status: 'NOT_STARTED',
          durationMinutes: 8,
          questionCount: 15,
        },
      ],
    });
    const path = `/attempts/${overview.attempts[0].id}`;

    // Answering before the start is refused.
    const key = await answerKey(communicationId);
    await http()
      .put(take(token, `${path}/answers/${key[0].questionId}`))
      .send({ optionId: key[0].optionId })
      .expect(409);

    const started = await http()
      .post(take(token, `${path}/start`))
      .expect(200);
    const attempt = bodyOf<AttemptBody>(started);
    expect(attempt.status).toBe('IN_PROGRESS');
    expect(attempt.questions).toHaveLength(15);
    expect(JSON.stringify(started.body)).not.toMatch(PRIVATE_KEYS);
    const minutes =
      (Date.parse(attempt.deadlineAt) - Date.parse(attempt.serverNow)) / 60_000;
    expect(minutes).toBeGreaterThan(7.9);
    expect(minutes).toBeLessThanOrEqual(8);

    // Starting again resumes with the same order.
    const resumed = bodyOf<AttemptBody>(
      await http()
        .post(take(token, `${path}/start`))
        .expect(200),
    );
    expect(resumed.questions.map((q) => q.id)).toEqual(
      attempt.questions.map((q) => q.id),
    );
    expect(resumed.questions[0].options.map((o) => o.id)).toEqual(
      attempt.questions[0].options.map((o) => o.id),
    );

    // An option from another question is refused; the key's options are saved.
    await http()
      .put(take(token, `${path}/answers/${key[0].questionId}`))
      .send({ optionId: key[1].optionId })
      .expect(400);
    for (const { questionId, optionId } of key) {
      await http()
        .put(take(token, `${path}/answers/${questionId}`))
        .send({ optionId })
        .expect(204);
    }
    const saved = bodyOf<AttemptBody>(
      await http()
        .post(take(token, `${path}/start`))
        .expect(200),
    );
    expect(saved.answers).toHaveLength(15);

    const submitted = await http()
      .post(take(token, `${path}/submit`))
      .expect(200);
    expect(bodyOf<{ status: string }>(submitted)).toEqual({
      status: 'SUBMITTED',
    });
    await http()
      .put(take(token, `${path}/answers/${key[0].questionId}`))
      .send({ optionId: key[0].optionId })
      .expect(409);
    await http()
      .post(take(token, `${path}/submit`))
      .expect(200);

    const detail = bodyOf<InvitationBody>(
      await member
        .get(`/api/assessment-invitations/${sent.invitation.id}`)
        .expect(200),
    );
    expect(detail.status).toBe('COMPLETED');
    expect(detail.attempts[0]).toMatchObject({
      status: 'SUBMITTED',
      score: 1,
      bandLabel: 'Strong communicator',
      correctCount: 15,
    });
    expect(detail.attempts[0].answers.every((a) => a.isCorrect)).toBe(true);
  });

  it('scores the motivation questionnaire against the role profile', async () => {
    const sent = bodyOf<SentBody>(
      await send({ name: 'Dan', email: emailFor('dan') }, [
        motivationId,
      ]).expect(201),
    );
    const token = tokenOf(sent.link);
    const attemptId = sent.invitation.attempts[0].id;
    await http()
      .post(take(token, `/attempts/${attemptId}/start`))
      .expect(200);

    // Staff side: find each workbook item (Q1–Q20) and the option with the calculator's value.
    const { snapshot } = await prisma.assessmentAttempt.findUniqueOrThrow({
      where: { id: attemptId },
    });
    const frozen = snapshot as unknown as AssessmentSnapshot;
    for (const question of frozen.questions) {
      const value = MOTIVATION_ANSWERS[Number(question.ref?.slice(1)) - 1];
      const option = question.options.find((o) => o.value === value);
      await http()
        .put(take(token, `/attempts/${attemptId}/answers/${question.id}`))
        .send({ optionId: option?.id })
        .expect(204);
    }
    await http()
      .post(take(token, `/attempts/${attemptId}/submit`))
      .expect(200);

    const detail = bodyOf<InvitationBody>(
      await admin
        .get(`/api/assessment-invitations/${sent.invitation.id}`)
        .expect(200),
    );
    const result = detail.attempts[0];
    expect(result.score).toBeCloseTo(0.8225, 6);
    expect(result.bandLabel).toBe('Good fit');
    expect(result.flags.map((f) => [f.ref, f.direction])).toEqual([
      ['Q11', 'CANDIDATE_WANTS_MORE'],
      ['Q12', 'CANDIDATE_WANTS_MORE'],
    ]);
  });

  it('closes an attempt when time runs out, scoring what was answered', async () => {
    const sent = bodyOf<SentBody>(
      await send({ name: 'Eve', email: emailFor('eve') }, [
        communicationId,
      ]).expect(201),
    );
    const token = tokenOf(sent.link);
    const path = `/attempts/${sent.invitation.attempts[0].id}`;
    await http()
      .post(take(token, `${path}/start`))
      .expect(200);

    const key = await answerKey(communicationId);
    await http()
      .put(take(token, `${path}/answers/${key[0].questionId}`))
      .send({ optionId: key[0].optionId })
      .expect(204);

    await prisma.assessmentAttempt.update({
      where: { id: sent.invitation.attempts[0].id },
      data: { deadlineAt: new Date(Date.now() - 60_000) },
    });
    const late = await http()
      .put(take(token, `${path}/answers/${key[1].questionId}`))
      .send({ optionId: key[1].optionId })
      .expect(409);
    expect(bodyOf<ErrorBody>(late).message).toMatch(/Time’s up/);

    const detail = bodyOf<InvitationBody>(
      await member
        .get(`/api/assessment-invitations/${sent.invitation.id}`)
        .expect(200),
    );
    expect(detail.attempts[0]).toMatchObject({
      status: 'EXPIRED',
      correctCount: 1,
    });
    expect(detail.attempts[0].score).toBeCloseTo(1 / 15, 6);
  });

  it('resends with a new link, and revokes', async () => {
    const sent = bodyOf<SentBody>(
      await send({ name: 'Finn', email: emailFor('finn') }, [
        motivationId,
      ]).expect(201),
    );
    const oldToken = tokenOf(sent.link);

    const resent = bodyOf<SentBody>(
      await member
        .post(`/api/assessment-invitations/${sent.invitation.id}/resend`)
        .send({})
        .expect(200),
    );
    expect(resent.emailSent).toBe(true);
    const newToken = tokenOf(resent.link);
    expect(newToken).not.toBe(oldToken);
    await http().get(take(oldToken)).expect(404);
    await http().get(take(newToken)).expect(200);
    const emails = mail.sent.filter((m) => m.to === emailFor('finn'));
    expect(takeTokenFrom(emails[emails.length - 1])).toBe(newToken);

    await member
      .delete(`/api/assessment-invitations/${sent.invitation.id}`)
      .expect(204);
    await http().get(take(newToken)).expect(404);
    const detail = bodyOf<InvitationBody>(
      await member
        .get(`/api/assessment-invitations/${sent.invitation.id}`)
        .expect(200),
    );
    expect(detail.status).toBe('REVOKED');
    await member
      .post(`/api/assessment-invitations/${sent.invitation.id}/resend`)
      .send({})
      .expect(409);
  });

  it('turns away expired and made-up links, and resending revives an expired one', async () => {
    const sent = bodyOf<SentBody>(
      await send({ name: 'Gil', email: emailFor('gil') }, [
        motivationId,
      ]).expect(201),
    );
    await prisma.assessmentInvitation.update({
      where: { id: sent.invitation.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const expired = await http()
      .get(take(tokenOf(sent.link)))
      .expect(410);
    expect(bodyOf<ErrorBody>(expired).message).toMatch(/expired/);
    await http()
      .get(take('x'.repeat(43)))
      .expect(404);
    await http().get(take('short')).expect(404);

    const resent = bodyOf<SentBody>(
      await admin
        .post(`/api/assessment-invitations/${sent.invitation.id}/resend`)
        .send({ expiresInDays: 3 })
        .expect(200),
    );
    await http()
      .get(take(tokenOf(resent.link)))
      .expect(200);
  });

  it('lists sent links with search, a test filter and pages', async () => {
    const page = bodyOf<ListBody>(
      await member
        .get(`/api/assessment-invitations?search=${RUN}&pageSize=2&page=1`)
        .expect(200),
    );
    expect(page.total).toBeGreaterThanOrEqual(7);
    expect(page.items).toHaveLength(2);
    expect(page.pageSize).toBe(2);

    const byTest = bodyOf<ListBody>(
      await member
        .get(`/api/assessment-invitations?assessmentId=${motivationId}`)
        .expect(200),
    );
    expect(byTest.items.length).toBeGreaterThan(0);
    expect(
      byTest.items.every((item) =>
        item.attempts.some((a) => a.assessmentId === motivationId),
      ),
    ).toBe(true);
  });

  it('finds candidates by name or email, and refuses a duplicate email', async () => {
    const found = bodyOf<{
      items: { email: string; invitationCount: number }[];
    }>(await member.get(`/api/candidates?search=${RUN}-ada`).expect(200));
    expect(found.items).toEqual([
      expect.objectContaining({ email: emailFor('ada'), invitationCount: 1 }),
    ]);
    await member
      .post('/api/candidates')
      .send({ name: 'Ada again', email: emailFor('ada') })
      .expect(409);
    await member
      .post('/api/candidates')
      .send({ name: 'Hana', email: emailFor('hana') })
      .expect(201);
  });
});
