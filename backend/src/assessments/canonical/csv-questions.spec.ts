import { QuestionType, ScoringMethod } from '../../generated/prisma/enums';
import {
  parseQuestionCsv,
  questionCsvTemplate,
  questionsToCsv,
} from './csv-questions';

const HEADER =
  'ref,section,type,difficulty,stem,option_a,option_b,option_c,option_d,correct';
const csv = (...rows: string[]) => [HEADER, ...rows].join('\n');

describe('parseQuestionCsv', () => {
  it('reads a single-choice row', () => {
    const { rows, errors } = parseQuestionCsv(
      csv(
        'Q1,Written,single choice,Easy,What is the point?,No,A smaller phase,Wrong,Delay,b',
      ),
      ScoringMethod.CORRECT_ANSWER,
    );

    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].row).toBe(2);
    expect(rows[0].question).toMatchObject({
      ref: 'Q1',
      section: 'Written',
      type: QuestionType.SINGLE_CHOICE,
      difficulty: 'EASY',
      stem: 'What is the point?',
    });
    expect(rows[0].question.options.map((o) => [o.label, o.correct])).toEqual([
      ['A', false],
      ['B', true],
      ['C', false],
      ['D', false],
    ]);
  });

  it('fills in True/False and reads "true" as the key', () => {
    const { rows, errors } = parseQuestionCsv(
      csv(',,true/false,,Ben wants a break.,,,,,true'),
      ScoringMethod.CORRECT_ANSWER,
    );

    expect(errors).toEqual([]);
    expect(rows[0].question.options).toEqual([
      expect.objectContaining({ text: 'True', correct: true }),
      expect.objectContaining({ text: 'False', correct: false }),
    ]);
  });

  it('builds rating scales from the size and the end labels', () => {
    const text = [
      'section,type,stem,scale_size,scale_min_label,scale_max_label,employer_prompt,employer_min_label,employer_max_label,employer_value',
      'Core,Rating 1–5,How important is variety?,5,Not important,Extremely important,How varied is the role?,Not at all,Very,3',
    ].join('\n');
    const { rows, errors } = parseQuestionCsv(text, ScoringMethod.ALIGNMENT);

    expect(errors).toEqual([]);
    const question = rows[0].question;
    expect(question.type).toBe(QuestionType.RATING_SCALE);
    expect(question.employerValue).toBe(3);
    expect(
      question.options.map((o) => [o.value, o.text, o.employerText]),
    ).toEqual([
      [1, 'Not important', 'Not at all'],
      [2, '', null],
      [3, '', null],
      [4, '', null],
      [5, 'Extremely important', 'Very'],
    ]);
  });

  it('reads the workbook wording "Choice (3 options)"', () => {
    const text = [
      'type,stem,option_a,option_b,option_c,employer_value',
      'Choice (3 options),Which pace suits you?,Steady,Mixed,Fast,2',
    ].join('\n');
    const { rows, errors } = parseQuestionCsv(text, ScoringMethod.ALIGNMENT);

    expect(errors).toEqual([]);
    expect(rows[0].question.type).toBe(QuestionType.CHOICE_SCALE);
    expect(rows[0].question.options.map((o) => o.value)).toEqual([1, 2, 3]);
  });

  it('points at the row and column of each problem, and keeps good rows', () => {
    const { rows, errors } = parseQuestionCsv(
      csv(
        'Q1,,single choice,,Fine question,Yes,No,,,A',
        '',
        'Q3,,single choice,,Bad key,Yes,No,Maybe,,E',
        'Q4,,essay,,Unknown type,Yes,No,,,A',
        'Q5,,single choice,Sometimes,Bad difficulty,Yes,,Maybe,,A',
        'Q6,,,,,Yes,No,,,A',
      ),
      ScoringMethod.CORRECT_ANSWER,
    );

    expect(rows.map((row) => row.question.ref)).toEqual(['Q1']);
    expect(errors.map(({ row, column }) => [row, column])).toEqual([
      [4, 'correct'],
      [5, 'type'],
      [6, 'difficulty'],
      [6, 'option_b'],
      [7, 'stem'],
    ]);
    expect(errors[0].message).toMatch(/A to C/);
  });

  it('refuses question types the test can’t hold', () => {
    const { errors } = parseQuestionCsv(
      csv(',,single choice,,Q,Yes,No,,,A'),
      ScoringMethod.ALIGNMENT,
    );

    expect(errors[0]).toMatchObject({ row: 2, column: null });
    expect(errors[0].message).toMatch(/can't go in a test scored by alignment/);
  });

  it('warns about unknown columns and needs a stem column', () => {
    expect(
      parseQuestionCsv('stem,Notes\nQ,hello', ScoringMethod.CORRECT_ANSWER)
        .warnings[0].message,
    ).toMatch(/"Notes" isn't one the import reads/);
    expect(
      parseQuestionCsv('ref,question\nQ1,Hi', ScoringMethod.CORRECT_ANSWER)
        .errors,
    ).toContainEqual(expect.objectContaining({ column: 'stem' }));
    expect(
      parseQuestionCsv('', ScoringMethod.CORRECT_ANSWER).errors[0].message,
    ).toMatch(/empty/);
  });
});

describe('questionsToCsv', () => {
  it('round-trips through the parser', () => {
    for (const method of [
      ScoringMethod.CORRECT_ANSWER,
      ScoringMethod.ALIGNMENT,
    ]) {
      const first = parseQuestionCsv(questionCsvTemplate(method), method);
      expect(first.errors).toEqual([]);
      expect(first.rows.length).toBeGreaterThan(1);

      const again = parseQuestionCsv(
        questionsToCsv(first.rows.map((row) => row.question)),
        method,
      );
      expect(again.rows.map((row) => row.question)).toEqual(
        first.rows.map((row) => row.question),
      );
    }
  });
});
