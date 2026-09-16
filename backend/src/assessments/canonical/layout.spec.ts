import { QuestionOrder, ScoringMethod } from '../../generated/prisma/enums';
import { buildLayout, mulberry32 } from './layout';
import { choiceQuestion, snapshotOf } from './snapshot.fixtures';

const ids = (count: number, sectionId: string) =>
  Array.from({ length: count }, (_, i) =>
    choiceQuestion(`${sectionId}-q${i}`, sectionId),
  );

describe('buildLayout', () => {
  it('keeps the written order when nothing shuffles', () => {
    const questions = [
      choiceQuestion('q1', 's1', 4, { shuffleOptions: false }),
      choiceQuestion('q2', 's2', 3, { shuffleOptions: false }),
    ];
    const layout = buildLayout(snapshotOf(questions), mulberry32(1));

    expect(layout).toEqual({
      version: 1,
      questions: [
        { questionId: 'q1', optionIds: ['q1-o0', 'q1-o1', 'q1-o2', 'q1-o3'] },
        { questionId: 'q2', optionIds: ['q2-o0', 'q2-o1', 'q2-o2'] },
      ],
    });
  });

  it('gives the same layout for the same seed', () => {
    const snapshot = snapshotOf([...ids(6, 's1'), ...ids(6, 's2')], {
      questionOrder: QuestionOrder.SHUFFLE_ALL,
    });

    expect(buildLayout(snapshot, mulberry32(42))).toEqual(
      buildLayout(snapshot, mulberry32(42)),
    );
    expect(buildLayout(snapshot, mulberry32(42))).not.toEqual(
      buildLayout(snapshot, mulberry32(7)),
    );
  });

  it('shuffles across the whole test for SHUFFLE_ALL', () => {
    const questions = [...ids(8, 's1'), ...ids(8, 's2')];
    const layout = buildLayout(
      snapshotOf(questions, { questionOrder: QuestionOrder.SHUFFLE_ALL }),
      mulberry32(3),
    );
    const order = layout.questions.map((entry) => entry.questionId);

    expect([...order].sort()).toEqual(questions.map((q) => q.id).sort());
    // With 16 questions, some from section two land in the first half.
    expect(order.slice(0, 8).some((id) => id.startsWith('s2'))).toBe(true);
  });

  it('keeps sections together for SHUFFLE_WITHIN_SECTION', () => {
    const questions = [
      ...ids(5, 's1'),
      ...ids(5, 's2'),
      choiceQuestion('loose', null),
    ];
    const layout = buildLayout(
      snapshotOf(questions, {
        questionOrder: QuestionOrder.SHUFFLE_WITHIN_SECTION,
      }),
      mulberry32(9),
    );
    const order = layout.questions.map((entry) => entry.questionId);

    expect(order.slice(0, 5).every((id) => id.startsWith('s1'))).toBe(true);
    expect(order.slice(5, 10).every((id) => id.startsWith('s2'))).toBe(true);
    expect(order[10]).toBe('loose');
  });

  it('never mixes dimensions in an alignment test, even with SHUFFLE_ALL', () => {
    const questions = [...ids(6, 's1'), ...ids(6, 's2')];
    for (let seed = 1; seed <= 20; seed++) {
      const layout = buildLayout(
        snapshotOf(questions, {
          questionOrder: QuestionOrder.SHUFFLE_ALL,
          scoringMethod: ScoringMethod.ALIGNMENT,
        }),
        mulberry32(seed),
      );
      const order = layout.questions.map((entry) => entry.questionId);
      expect(order.slice(0, 6).every((id) => id.startsWith('s1'))).toBe(true);
    }
  });

  it('keeps "None of these" last when asked', () => {
    const question = choiceQuestion('q', 's1', 4, {
      keepLastOptionFixed: true,
    });
    for (let seed = 1; seed <= 20; seed++) {
      const [entry] = buildLayout(
        snapshotOf([question]),
        mulberry32(seed),
      ).questions;
      expect(entry.optionIds[3]).toBe('q-o3');
      expect([...entry.optionIds].sort()).toEqual([
        'q-o0',
        'q-o1',
        'q-o2',
        'q-o3',
      ]);
    }
  });

  it('shuffles options when the question allows it', () => {
    const question = choiceQuestion('q', 's1', 4);
    const orders = new Set(
      Array.from({ length: 10 }, (_, seed) =>
        buildLayout(
          snapshotOf([question]),
          mulberry32(seed + 1),
        ).questions[0].optionIds.join(),
      ),
    );

    expect(orders.size).toBeGreaterThan(1);
  });
});
