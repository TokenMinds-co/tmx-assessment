import { QuestionType, ScoringMethod } from '../../generated/prisma/enums';
import { bandFor, scoreAttempt } from './scoring';
import type { AssessmentSnapshot } from './snapshot';
import {
  bands,
  choiceQuestion,
  scaleQuestion,
  snapshotOf,
} from './snapshot.fixtures';

// Bands from the Rubric sheets. English uses 0.875 and 0.6875 in place of the
// sheet's 0.88 and 0.69, which contradict its own "14–16" and "11–13" columns.
const COMMUNICATION = bands(
  [0.86, 'Strong communicator'],
  [0.66, 'Competent'],
  [0.46, 'Developing'],
  [0, 'Needs significant development'],
);
const CRITICAL_THINKING = bands(
  [0.875, 'Advanced'],
  [0.6875, 'Strong'],
  [0.5, 'Developing'],
  [0, 'Below expectation'],
);
const ENGLISH = bands(
  [0.875, 'Strong B1 / likely B2'],
  [0.6875, 'Solid B1'],
  [0.5, 'Borderline A2/B1'],
  [0, 'Below B1'],
);
const MOTIVATION = bands(
  [0.85, 'Strong fit'],
  [0.7, 'Good fit'],
  [0.55, 'Partial fit'],
  [0, 'Low fit'],
);

/** A skills test with questions alternating between two sections. */
function skillsTest(
  count: number,
  testBands = COMMUNICATION,
): AssessmentSnapshot {
  const questions = Array.from({ length: count }, (_, i) =>
    choiceQuestion(`q${i + 1}`, i % 2 === 0 ? 's1' : 's2'),
  );
  return snapshotOf(questions, { bands: testBands });
}

/** The first `correct` questions answered right, the rest answered wrong. */
function answersFor(snapshot: AssessmentSnapshot, correct: number) {
  return new Map(
    snapshot.questions.map((question, i) => [
      question.id,
      question.options[i < correct ? 0 : 1].id,
    ]),
  );
}

describe('scoring: correct answers', () => {
  it.each([
    ['Communication', 15, COMMUNICATION, 13, 'Strong communicator'],
    ['Communication', 15, COMMUNICATION, 11, 'Competent'],
    ['Communication', 15, COMMUNICATION, 10, 'Competent'],
    ['Communication', 15, COMMUNICATION, 7, 'Developing'],
    ['Communication', 15, COMMUNICATION, 6, 'Needs significant development'],
    ['Critical Thinking', 16, CRITICAL_THINKING, 14, 'Advanced'],
    ['Critical Thinking', 16, CRITICAL_THINKING, 12, 'Strong'],
    ['Critical Thinking', 16, CRITICAL_THINKING, 11, 'Strong'],
    ['Critical Thinking', 16, CRITICAL_THINKING, 8, 'Developing'],
    ['Critical Thinking', 16, CRITICAL_THINKING, 7, 'Below expectation'],
    ['English B1', 16, ENGLISH, 14, 'Strong B1 / likely B2'],
    ['English B1', 16, ENGLISH, 12, 'Solid B1'],
    ['English B1', 16, ENGLISH, 11, 'Solid B1'],
    ['English B1', 16, ENGLISH, 8, 'Borderline A2/B1'],
    ['English B1', 16, ENGLISH, 7, 'Below B1'],
  ])(
    '%s: %i questions, %i right → %s',
    (_name, count, testBands, correct, band) => {
      const snapshot = skillsTest(count, testBands);
      const result = scoreAttempt(snapshot, answersFor(snapshot, correct));

      expect(result.score).toBeCloseTo(correct / count, 10);
      expect(result.correctCount).toBe(correct);
      expect(result.bandLabel).toBe(band);
    },
  );

  it('scores each section on its own', () => {
    const snapshot = skillsTest(8);
    // q1, q3, q5, q7 are in section one; q2, q4, q6, q8 in section two.
    const answers = new Map(
      snapshot.questions.map((question, i) => [
        question.id,
        question.options[i % 2 === 0 ? 0 : 1].id,
      ]),
    );
    const result = scoreAttempt(snapshot, answers);

    expect(result.sections).toEqual([
      expect.objectContaining({
        name: 'Section one',
        score: 1,
        correct: 4,
        total: 4,
      }),
      expect.objectContaining({
        name: 'Section two',
        score: 0,
        correct: 0,
        total: 4,
      }),
    ]);
    expect(result.score).toBe(0.5);
  });

  it('scores unanswered questions and unknown options as wrong', () => {
    const snapshot = skillsTest(4);
    const result = scoreAttempt(
      snapshot,
      new Map([
        ['q1', 'q1-o0'],
        ['q2', 'not-an-option'],
      ]),
    );

    expect(result.correctCount).toBe(1);
    expect(result.answeredCount).toBe(1);
    expect(result.score).toBe(0.25);
  });

  it('gives an empty attempt the lowest band', () => {
    const result = scoreAttempt(skillsTest(15), new Map());

    expect(result.score).toBe(0);
    expect(result.bandLabel).toBe('Needs significant development');
  });
});

describe('scoring: alignment (motivation)', () => {
  // The example on the workbook's "Alignment calculator" sheet: an on-site
  // customer-support role, and a candidate who wants more flexibility and remote work.
  const EMPLOYER = [3, 3, 4, 2, 4, 3, 4, 5, 3, 4, 2, 1, 3, 3, 3, 5, 2, 4, 2, 3];
  const CANDIDATE = [
    4, 3, 5, 3, 4, 4, 4, 5, 4, 4, 4, 3, 4, 4, 2, 5, 3, 3, 2, 3,
  ];
  const DIMENSIONS = [
    { id: 'core', name: 'Core job characteristics', size: 5, weight: 0.35 },
    { id: 'moderators', name: 'Motivation moderators', size: 3, weight: 0.15 },
    {
      id: 'extrinsic',
      name: 'Extrinsic & workplace factors',
      size: 6,
      weight: 0.3,
    },
    { id: 'activities', name: 'Work activities', size: 6, weight: 0.2 },
  ];

  function motivation(): AssessmentSnapshot {
    const sectionOf = DIMENSIONS.flatMap((d) =>
      Array<string>(d.size).fill(d.id),
    );
    const questions = EMPLOYER.map((employerValue, i) =>
      i < 18
        ? scaleQuestion(
            `Q${i + 1}`,
            sectionOf[i],
            QuestionType.RATING_SCALE,
            5,
            employerValue,
          )
        : scaleQuestion(
            `Q${i + 1}`,
            sectionOf[i],
            QuestionType.CHOICE_SCALE,
            3,
            employerValue,
          ),
    );
    return snapshotOf(questions, {
      scoringMethod: ScoringMethod.ALIGNMENT,
      sections: DIMENSIONS.map(({ id, name, weight }) => ({
        id,
        name,
        weight,
      })),
      bands: MOTIVATION,
    });
  }

  const candidateAnswers = (snapshot: AssessmentSnapshot) =>
    new Map(
      snapshot.questions.map((q, i) => [q.id, `${q.id}-v${CANDIDATE[i]}`]),
    );

  it('matches the workbook calculator: 0.8225, "Good fit"', () => {
    const snapshot = motivation();
    const result = scoreAttempt(snapshot, candidateAnswers(snapshot));

    expect(result.sections.map((s) => s.score)).toEqual([
      expect.closeTo(0.85, 6),
      expect.closeTo(0.916667, 6),
      expect.closeTo(0.708333, 6),
      expect.closeTo(0.875, 6),
    ]);
    expect(result.score).toBeCloseTo(0.8225, 10);
    expect(result.bandLabel).toBe('Good fit');
    expect(result.correctCount).toBeNull();
    expect(result.answeredCount).toBe(20);
  });

  it('flags the two hard-constraint gaps, with their direction', () => {
    const snapshot = motivation();
    const result = scoreAttempt(snapshot, candidateAnswers(snapshot));

    expect(result.flags).toEqual([
      expect.objectContaining({
        ref: 'Q11',
        employerValue: 2,
        candidateValue: 4,
        gap: 2,
        direction: 'CANDIDATE_WANTS_MORE',
      }),
      expect.objectContaining({
        ref: 'Q12',
        employerValue: 1,
        candidateValue: 3,
        gap: 2,
        direction: 'CANDIDATE_WANTS_MORE',
      }),
    ]);
  });

  it('scores choice items 1, 0.5 or 0, and flags opposite ends', () => {
    const snapshot = snapshotOf(
      [scaleQuestion('pace', 's1', QuestionType.CHOICE_SCALE, 3, 1)],
      {
        scoringMethod: ScoringMethod.ALIGNMENT,
        sections: [{ id: 's1', name: 'A', weight: 1 }],
      },
    );
    const score = (value: number) =>
      scoreAttempt(snapshot, new Map([['pace', `pace-v${value}`]]));

    expect(score(1).score).toBe(1);
    expect(score(2).score).toBe(0.5);
    expect(score(3).score).toBe(0);
    expect(score(3).flags[0].direction).toBe('CANDIDATE_WANTS_MORE');
    expect(score(2).flags).toEqual([]);
  });

  it('averages only answered items, and scores a blank dimension 0', () => {
    const snapshot = motivation();
    const answers = new Map([['Q1', 'Q1-v3']]);
    const result = scoreAttempt(snapshot, answers);

    expect(result.sections[0]).toMatchObject({
      score: 1,
      answered: 1,
      total: 5,
    });
    expect(result.sections[1]).toMatchObject({ score: 0, answered: 0 });
    expect(result.score).toBeCloseTo(0.35, 10);
  });
});

describe('bandFor', () => {
  it('picks the highest band at or below the score, whatever the input order', () => {
    const unordered = [
      COMMUNICATION[2],
      COMMUNICATION[0],
      COMMUNICATION[3],
      COMMUNICATION[1],
    ];

    expect(bandFor(unordered, 0.66)?.label).toBe('Competent');
    expect(bandFor(unordered, 0.659)?.label).toBe('Developing');
    expect(bandFor([], 0.5)).toBeNull();
  });
});
