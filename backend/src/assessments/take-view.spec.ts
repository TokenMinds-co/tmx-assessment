import { join } from 'node:path';
import { QuestionType } from '../generated/prisma/enums';
import { readSeedFile } from './assessment-seed.service';
import { buildLayout, mulberry32 } from './canonical/layout';
import { snapshotFromCanonical } from './canonical/snapshot.fixtures';
import { answerKey, takeQuestions } from './take-view';

const SEED = join(__dirname, '../../seed/assessments');
const SLUGS = [
  'communication',
  'critical-thinking',
  'english-b1',
  'motivation',
];

// Keys that would give away answers, staff notes or the role profile.
const PRIVATE_KEYS = [
  'isCorrect',
  'correct',
  'rationale',
  'transcript',
  'difficulty',
  'ref',
  'employerPrompt',
  'employerValue',
  'employerText',
  'sectionId',
  'value',
  'label',
];

const load = async (slug: string) =>
  snapshotFromCanonical(await readSeedFile(join(SEED, `${slug}.json`)));

describe('takeQuestions', () => {
  it.each(SLUGS)('shows %s without answers or staff notes', async (slug) => {
    const snapshot = await load(slug);
    const questions = takeQuestions(
      snapshot,
      buildLayout(snapshot, mulberry32(1)),
    );
    const json = JSON.stringify(questions);

    for (const key of PRIVATE_KEYS) expect(json).not.toContain(`"${key}"`);
    expect(questions).toHaveLength(snapshot.questions.length);
    expect(questions.map((q) => q.number)).toEqual(
      questions.map((_, i) => i + 1),
    );
  });

  it('follows the layout order for questions and options', async () => {
    const snapshot = await load('critical-thinking');
    const layout = buildLayout(snapshot, mulberry32(5));
    const questions = takeQuestions(snapshot, layout);

    expect(questions.map((q) => q.id)).toEqual(
      layout.questions.map((e) => e.questionId),
    );
    expect(questions[0].options.map((o) => o.id)).toEqual(
      layout.questions[0].optionIds,
    );
  });

  it('points audio at the media endpoint', async () => {
    const snapshot = await load('english-b1');
    const questions = takeQuestions(
      snapshot,
      buildLayout(snapshot, mulberry32(2)),
    );
    const withAudio = questions.filter((q) => q.media);

    expect(withAudio).toHaveLength(4);
    expect(withAudio[0].media?.url).toMatch(/^\/api\/media\//);
  });
});

describe('answerKey', () => {
  it('gives the right option for skills tests', async () => {
    const snapshot = await load('communication');
    const key = answerKey(snapshot);

    expect(key).toHaveLength(15);
    expect(key.every((entry) => entry.kind === 'CORRECT')).toBe(true);
    const first = snapshot.questions[0];
    expect(key[0].optionId).toBe(first.options.find((o) => o.isCorrect)?.id);
  });

  it('gives the role profile’s option for scales', async () => {
    const snapshot = await load('motivation');
    const key = answerKey(snapshot);
    const pace = snapshot.questions.find(
      (q) => q.type === QuestionType.CHOICE_SCALE,
    );

    expect(key.every((entry) => entry.kind === 'ROLE_PROFILE')).toBe(true);
    expect(key.find((entry) => entry.questionId === pace?.id)?.optionId).toBe(
      pace?.options.find((o) => o.value === pace.employerValue)?.id,
    );
  });
});
