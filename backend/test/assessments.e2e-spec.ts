import type { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import request from 'supertest';
import { parseCsv } from '../src/common/csv';
import { generateToken, hashToken } from '../src/common/tokens';
import { UserRole } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import { type Agent, createStaff, signIn } from './utils/staff';
import { createTestApp } from './utils/test-app';

// Everything this suite creates carries the run's prefix (slugs, emails) and
// is deleted at the end.
const RUN = `e2e-${randomUUID().slice(0, 8)}`;
const emailFor = (label: string) => `${RUN}-${label}@example.test`;
const slugFor = (label: string) => `${RUN}-${label}`;
const SEED = join(__dirname, '../seed/assessments');

interface OptionBody {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
}

interface QuestionBody {
  id: string;
  ref: string | null;
  stem: string;
  type: string;
  sectionId: string | null;
  options: OptionBody[];
}

interface AssessmentBody {
  id: string;
  slug: string;
  name: string;
  status: string;
  scoringMethod: string;
  questionCount: number;
  missingMediaCount: number;
  sections: { id: string; name: string; weight: number | null }[];
  questions: QuestionBody[];
  bands: { minScore: number; label: string }[];
  problems: string[];
}

interface ImportBody {
  dryRun: boolean;
  rowCount: number;
  importedCount: number;
  newSections: string[];
  errors: { row: number | null; column: string | null; message: string }[];
  warnings: { row: number | null; column: string | null; message: string }[];
  assessment?: AssessmentBody;
}

interface ErrorBody {
  message: string | string[];
}

const bodyOf = <T>(res: request.Response): T => res.body as T;

const seedDocument = (file: string, slug: string) => ({
  ...(JSON.parse(readFileSync(join(SEED, `${file}.json`), 'utf8')) as Record<
    string,
    unknown
  >),
  slug: slugFor(slug),
});

/** A single-choice question. `correct` is the index of the right option, or -1 for none. */
const choice = (
  stem: string,
  {
    correct = 1,
    count = 3,
    sectionId,
  }: { correct?: number; count?: number; sectionId?: string } = {},
) => ({
  type: 'SINGLE_CHOICE',
  stem,
  sectionId,
  options: Array.from({ length: count }, (_, i) => ({
    text: `Option ${String.fromCharCode(65 + i)}`,
    isCorrect: i === correct,
  })),
});

describe('Assessments (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let storageDir: string;
  let admin: Agent;
  let member: Agent;

  const http = () => request(app.getHttpServer());

  async function createTest(label: string, scoringMethod = 'CORRECT_ANSWER') {
    const res = await admin
      .post('/api/assessments')
      .send({ name: `${RUN} ${label}`, slug: slugFor(label), scoringMethod })
      .expect(201);
    return bodyOf<AssessmentBody>(res);
  }

  const importSeed = async (file: string, slug: string) =>
    bodyOf<AssessmentBody>(
      await admin
        .post('/api/assessments/import')
        .send(seedDocument(file, slug))
        .expect(201),
    );

  beforeAll(async () => {
    ({ app, storageDir } = await createTestApp());
    prisma = app.get(PrismaService);
    admin = await signIn(
      app,
      await createStaff(app, emailFor('admin'), UserRole.ADMIN),
    );
    member = await signIn(app, await createStaff(app, emailFor('member')));
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
    await rm(storageDir, { recursive: true, force: true });
    await app.close();
  });

  describe('creating and editing', () => {
    it('creates a draft with default bands, for admins only', async () => {
      await member
        .post('/api/assessments')
        .send({ name: 'Nope', scoringMethod: 'CORRECT_ANSWER' })
        .expect(403);

      const test = await createTest('draft');
      expect(test).toMatchObject({
        status: 'DRAFT',
        scoringMethod: 'CORRECT_ANSWER',
      });
      expect(test.questions).toEqual([]);
      expect(test.bands.map((band) => band.minScore)).toEqual([
        0.85, 0.65, 0.45, 0,
      ]);
      expect(test.problems).toEqual(['Add at least one question.']);

      await member.get(`/api/assessments/${test.id}`).expect(200);
      await admin
        .post('/api/assessments')
        .send({
          name: 'Again',
          slug: test.slug,
          scoringMethod: 'CORRECT_ANSWER',
        })
        .expect(409);
    });

    it('builds a test from sections, questions and bands, then publishes it', async () => {
      let test = await createTest('built');
      const url = `/api/assessments/${test.id}`;

      test = bodyOf(
        await admin
          .post(`${url}/sections`)
          .send({ name: 'Accuracy' })
          .expect(201),
      );
      const sectionId = test.sections[0].id;
      test = bodyOf(
        await admin
          .post(`${url}/questions`)
          .send(choice('First question?', { sectionId }))
          .expect(201),
      );
      test = bodyOf(
        await admin
          .post(`${url}/questions`)
          .send({
            type: 'TRUE_FALSE',
            stem: 'True or false: this works?',
            options: [{ text: 'True', isCorrect: true }, { text: 'False' }],
          })
          .expect(201),
      );
      expect(test.questions.map((q) => q.options.map((o) => o.label))).toEqual([
        ['A', 'B', 'C'],
        ['A', 'B'],
      ]);

      // Keep two options by id, drop the third, and move the key.
      const [first, second] = test.questions;
      test = bodyOf(
        await admin
          .put(`${url}/questions/${first.id}`)
          .send({
            type: 'SINGLE_CHOICE',
            stem: 'First question, edited?',
            sectionId,
            options: [
              { id: first.options[0].id, text: 'Kept A', isCorrect: true },
              { id: first.options[1].id, text: 'Kept B' },
            ],
          })
          .expect(200),
      );
      const edited = test.questions.find((q) => q.id === first.id);
      expect(edited?.stem).toBe('First question, edited?');
      expect(edited?.options.map((o) => o.id)).toEqual([
        first.options[0].id,
        first.options[1].id,
      ]);

      test = bodyOf(
        await admin
          .put(`${url}/questions/order`)
          .send({ ids: [second.id, first.id] })
          .expect(200),
      );
      expect(test.questions.map((q) => q.id)).toEqual([second.id, first.id]);
      await admin
        .put(`${url}/questions/order`)
        .send({ ids: [second.id] })
        .expect(400);

      test = bodyOf(
        await admin.post(`${url}/questions/${second.id}/duplicate`).expect(201),
      );
      expect(test.questions.map((q) => q.stem)).toEqual([
        'True or false: this works?',
        'True or false: this works?',
        'First question, edited?',
      ]);

      test = bodyOf(
        await admin
          .put(`${url}/bands`)
          .send({
            bands: [
              { minScore: 0, label: 'Low' },
              { minScore: 0.7, label: 'High' },
            ],
          })
          .expect(200),
      );
      expect(test.bands.map((band) => band.label)).toEqual(['High', 'Low']);

      await member.patch(url).send({ status: 'PUBLISHED' }).expect(403);
      test = bodyOf(
        await admin.patch(url).send({ status: 'PUBLISHED' }).expect(200),
      );
      expect(test).toMatchObject({ status: 'PUBLISHED', problems: [] });

      const list = bodyOf<{ items: AssessmentBody[] }>(
        await member.get('/api/assessments').expect(200),
      );
      expect(list.items.find((item) => item.id === test.id)).toMatchObject({
        questionCount: 3,
        status: 'PUBLISHED',
      });
    });

    it('refuses incomplete questions and questions of the wrong kind', async () => {
      const test = await createTest('strict');
      const url = `/api/assessments/${test.id}/questions`;

      const noKey = await admin
        .post(url)
        .send(choice('No key?', { correct: -1 }))
        .expect(400);
      expect(bodyOf<ErrorBody>(noKey).message).toContain(
        'Mark exactly one option as correct.',
      );

      const scale = await admin
        .post(url)
        .send({
          type: 'RATING_SCALE',
          stem: 'How much?',
          employerValue: 3,
          options: [1, 2, 3, 4, 5].map(() => ({ text: '' })),
        })
        .expect(400);
      expect(String(bodyOf<ErrorBody>(scale).message)).toMatch(
        /no right answer/,
      );

      await admin
        .post(url)
        .send({ ...choice('Extra?'), secret: true })
        .expect(400);
    });

    it('refuses to publish a test with problems', async () => {
      const test = await createTest('empty');
      const res = await admin
        .patch(`/api/assessments/${test.id}`)
        .send({ status: 'PUBLISHED' })
        .expect(400);
      expect(bodyOf<ErrorBody>(res).message).toEqual([
        'Add at least one question.',
      ]);
    });

    it('keeps the scoring method while questions of the other kind remain', async () => {
      const test = await createTest('method');
      await admin
        .post(`/api/assessments/${test.id}/questions`)
        .send(choice('Q?'))
        .expect(201);
      const res = await admin
        .patch(`/api/assessments/${test.id}`)
        .send({ scoringMethod: 'ALIGNMENT' })
        .expect(400);
      expect(String(bodyOf<ErrorBody>(res).message)).toMatch(
        /can’t be scored by alignment/,
      );
    });
  });

  describe('import and export', () => {
    it('imports every prefilled test', async () => {
      const expected = [
        ['communication', 15, 'CORRECT_ANSWER'],
        ['critical-thinking', 16, 'CORRECT_ANSWER'],
        ['english-b1', 16, 'CORRECT_ANSWER'],
        ['motivation', 20, 'ALIGNMENT'],
      ] as const;
      for (const [file, count, method] of expected) {
        const test = await importSeed(file, file);
        expect(test).toMatchObject({
          slug: slugFor(file),
          status: 'DRAFT',
          scoringMethod: method,
          questionCount: count,
        });
        if (method === 'ALIGNMENT') {
          expect(test.sections.map((s) => s.weight)).toEqual([
            0.35, 0.15, 0.3, 0.2,
          ]);
        }
      }
    });

    it('round-trips a test through export and import, and refuses a taken slug', async () => {
      const source = await importSeed('english-b1', 'english-source');
      const exported = await member
        .get(`/api/assessments/${source.id}/export`)
        .expect(200);
      expect(exported.headers['content-disposition']).toContain(
        `${source.slug}.json`,
      );

      const document = bodyOf<Record<string, unknown>>(exported);
      expect(document.format).toBe('tmx-assessment/1');
      const copy = bodyOf<AssessmentBody>(
        await admin
          .post('/api/assessments/import')
          .send({ ...document, slug: slugFor('english-copy') })
          .expect(201),
      );
      expect(copy.questions.map((q) => q.stem)).toEqual(
        source.questions.map((q) => q.stem),
      );
      expect(
        copy.questions.map((q) => q.options.map((o) => o.isCorrect)),
      ).toEqual(source.questions.map((q) => q.options.map((o) => o.isCorrect)));
      await admin.post('/api/assessments/import').send(document).expect(409);
    });

    it('lists what is wrong with an imported document', async () => {
      const document = seedDocument('communication', 'broken') as Record<
        string,
        unknown
      > & {
        questions: { options: { correct?: boolean }[] }[];
      };
      for (const option of document.questions[0].options) delete option.correct;

      const res = await admin
        .post('/api/assessments/import')
        .send(document)
        .expect(400);
      expect(bodyOf<ErrorBody>(res).message).toContain(
        'Question 1 (Q1): Mark exactly one option as correct.',
      );
    });

    it('duplicates a test as a draft', async () => {
      const source = await createTest('original');
      await admin
        .post(`/api/assessments/${source.id}/questions`)
        .send(choice('Q?'))
        .expect(201);

      const copy = bodyOf<AssessmentBody>(
        await admin.post(`/api/assessments/${source.id}/duplicate`).expect(201),
      );
      expect(copy).toMatchObject({
        slug: `${source.slug}-copy`,
        name: `${source.name} (copy)`,
        status: 'DRAFT',
        questionCount: 1,
      });
    });
  });

  describe('preview', () => {
    it('shows a draft as a candidate sees it, with the answer key, and scores it', async () => {
      const test = await importSeed('critical-thinking', 'preview');
      const res = await member
        .get(`/api/assessments/${test.id}/preview`)
        .expect(200);
      const preview = bodyOf<{
        status: string;
        questions: unknown[];
        answerKey: { questionId: string; optionId: string }[];
      }>(res);

      expect(preview.status).toBe('DRAFT');
      expect(preview.questions).toHaveLength(16);
      expect(JSON.stringify(preview.questions)).not.toMatch(
        /isCorrect|rationale|"ref"/,
      );

      const perfect = await member
        .post(`/api/assessments/${test.id}/preview/score`)
        .send({
          answers: preview.answerKey.map(({ questionId, optionId }) => ({
            questionId,
            optionId,
          })),
        })
        .expect(200);
      expect(
        bodyOf<{ score: number; bandLabel: string }>(perfect),
      ).toMatchObject({
        score: 1,
        bandLabel: 'Advanced',
      });

      const blank = await member
        .post(`/api/assessments/${test.id}/preview/score`)
        .send({ answers: [] })
        .expect(200);
      expect(bodyOf<{ score: number; bandLabel: string }>(blank)).toMatchObject(
        {
          score: 0,
          bandLabel: 'Below expectation',
        },
      );
    });
  });

  describe('question CSV', () => {
    const HEADER =
      'ref,section,type,stem,option_a,option_b,option_c,correct,media';
    const upload = (agent: Agent, id: string, csv: string, query: string) =>
      agent
        .post(`/api/assessments/${id}/questions/import?${query}`)
        .attach('file', Buffer.from(csv, 'utf8'), 'questions.csv');

    it('previews problems by row and column, then imports', async () => {
      const test = await createTest('csv');
      const broken = [
        HEADER,
        'C1,Accuracy,single choice,Good row?,Yes,No,,A,',
        'C2,Accuracy,single choice,Bad key?,Yes,No,Maybe,E,',
      ].join('\n');

      const dry = bodyOf<ImportBody>(
        await upload(admin, test.id, broken, 'dryRun=true').expect(200),
      );
      expect(dry).toMatchObject({
        dryRun: true,
        rowCount: 1,
        importedCount: 0,
        newSections: ['Accuracy'],
      });
      expect(dry.errors).toEqual([
        expect.objectContaining({ row: 3, column: 'correct' }),
      ]);

      await upload(admin, test.id, broken, 'dryRun=false').expect(400);
      const unchanged = bodyOf<AssessmentBody>(
        await admin.get(`/api/assessments/${test.id}`).expect(200),
      );
      expect(unchanged.questions).toHaveLength(0);

      const done = bodyOf<ImportBody>(
        await upload(
          admin,
          test.id,
          broken.replace(',E,', ',C,'),
          'mode=append',
        ).expect(200),
      );
      expect(done.importedCount).toBe(2);
      expect(done.assessment?.questions.map((q) => q.ref)).toEqual([
        'C1',
        'C2',
      ]);
      expect(done.assessment?.sections.map((s) => s.name)).toEqual([
        'Accuracy',
      ]);

      const replaced = bodyOf<ImportBody>(
        await upload(
          admin,
          test.id,
          [HEADER, 'R1,accuracy,true/false,Replaced?,,,,true,'].join('\n'),
          'mode=replace',
        ).expect(200),
      );
      expect(replaced.assessment?.questions.map((q) => q.ref)).toEqual(['R1']);
      expect(replaced.assessment?.sections).toHaveLength(1);
    });

    it('flags audio that hasn’t been uploaded yet', async () => {
      const test = await createTest('csv-media');
      const csv = [
        HEADER,
        `M1,,single choice,Listen?,Yes,No,,A,${RUN}-missing.mp3`,
      ].join('\n');

      const result = bodyOf<ImportBody>(
        await upload(admin, test.id, csv, 'mode=append').expect(200),
      );
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ row: 2, column: 'media' }),
      );
      expect(result.assessment?.missingMediaCount).toBe(1);
      expect(result.assessment?.problems[0]).toMatch(/upload the audio file/);
    });

    it('exports CSV the import reads back, and serves the template', async () => {
      const test = await importSeed('motivation', 'csv-export');
      const res = await member
        .get(`/api/assessments/${test.id}/questions/export.csv`)
        .expect(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text.charCodeAt(0)).toBe(0xfeff);
      const rows = parseCsv(res.text);
      expect(rows[0][0]).toBe('ref');
      expect(rows).toHaveLength(21);

      const target = await createTest('csv-reimport', 'ALIGNMENT');
      const reimported = bodyOf<ImportBody>(
        await upload(admin, target.id, res.text, 'mode=append').expect(200),
      );
      expect(reimported.importedCount).toBe(20);
      expect(reimported.newSections).toHaveLength(4);

      const template = await member
        .get('/api/assessments/csv-template?scoringMethod=ALIGNMENT')
        .expect(200);
      expect(template.headers['content-disposition']).toContain(
        'questions-template.csv',
      );
    });

    it('limits CSV import to admins', async () => {
      const test = await createTest('csv-member');
      await upload(member, test.id, HEADER, 'dryRun=true').expect(403);
    });
  });

  describe('deleting', () => {
    it('deletes a test that was never sent', async () => {
      const test = await createTest('delete-me');
      await member.delete(`/api/assessments/${test.id}`).expect(403);
      await admin.delete(`/api/assessments/${test.id}`).expect(204);
      await admin.get(`/api/assessments/${test.id}`).expect(404);
    });

    it('won’t delete a test that was sent, but archives it', async () => {
      const test = await createTest('sent');
      const candidate = await prisma.candidate.create({
        data: { email: emailFor('candidate'), name: 'Ada' },
      });
      await prisma.assessmentInvitation.create({
        data: {
          candidateId: candidate.id,
          tokenHash: hashToken(generateToken()),
          expiresAt: new Date(Date.now() + 86_400_000),
          attempts: {
            create: [{ assessmentId: test.id, order: 0, snapshot: {} }],
          },
        },
      });

      const res = await admin.delete(`/api/assessments/${test.id}`).expect(409);
      expect(bodyOf<ErrorBody>(res).message).toMatch(/Archive it instead/);
      const archived = await admin
        .patch(`/api/assessments/${test.id}`)
        .send({ status: 'ARCHIVED' })
        .expect(200);
      expect(bodyOf<AssessmentBody>(archived).status).toBe('ARCHIVED');
    });
  });

  it('answers 401 without a session, 404 for an unknown test and 400 for a bad id', async () => {
    await http().get('/api/assessments').expect(401);
    await member.get(`/api/assessments/${randomUUID()}`).expect(404);
    await member.get('/api/assessments/not-a-uuid').expect(400);
  });
});
