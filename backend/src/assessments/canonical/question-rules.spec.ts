import { QuestionType, ScoringMethod } from '../../generated/prisma/enums';
import type { CanonicalQuestion } from './canonical.types';
import {
  normalizeQuestion,
  questionProblems,
  shufflesOptions,
} from './question-rules';

const choice = (
  overrides: Partial<CanonicalQuestion> = {},
): CanonicalQuestion =>
  normalizeQuestion({
    type: QuestionType.SINGLE_CHOICE,
    stem: ' What is the main point? ',
    options: [
      { text: ' Rejecting it ' },
      { text: 'A smaller first phase', correct: true },
      { text: 'Wrong direction' },
    ],
    ...overrides,
  });

describe('normalizeQuestion', () => {
  it('trims text and letters the options', () => {
    const question = choice();

    expect(question.stem).toBe('What is the main point?');
    expect(question.options.map((option) => option.label)).toEqual([
      'A',
      'B',
      'C',
    ]);
    expect(question.options[0].text).toBe('Rejecting it');
    expect(question.options.map((option) => option.correct)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('fills in True and False', () => {
    const question = normalizeQuestion({
      type: QuestionType.TRUE_FALSE,
      stem: 'True or False: Ben wants a break.',
      options: [],
    });

    expect(question.options.map((option) => option.text)).toEqual([
      'True',
      'False',
    ]);
  });

  it('numbers scale points and drops right answers from them', () => {
    const question = normalizeQuestion({
      type: QuestionType.RATING_SCALE,
      stem: 'How important is variety?',
      options: [
        { text: 'Not important', correct: true },
        { text: '' },
        { text: 'Very' },
      ],
      employerValue: 2,
    });

    expect(
      question.options.map((option) => [option.label, option.value]),
    ).toEqual([
      ['1', 1],
      ['2', 2],
      ['3', 3],
    ]);
    expect(question.options.some((option) => option.correct)).toBe(false);
  });
});

describe('questionProblems', () => {
  it('passes a complete single-choice question', () => {
    expect(questionProblems(choice(), ScoringMethod.CORRECT_ANSWER)).toEqual(
      [],
    );
  });

  it('needs exactly one correct option', () => {
    const none = choice({ options: [{ text: 'A' }, { text: 'B' }] });

    expect(questionProblems(none, ScoringMethod.CORRECT_ANSWER)).toContain(
      'Mark exactly one option as correct.',
    );
  });

  it('keeps scales out of right-answer tests, and the reverse', () => {
    const scale = normalizeQuestion({
      type: QuestionType.RATING_SCALE,
      stem: 'How important is pay?',
      options: [{ text: 'Low' }, { text: '' }, { text: 'High' }],
      employerValue: 2,
    });

    expect(questionProblems(scale, ScoringMethod.ALIGNMENT)).toEqual([]);
    expect(questionProblems(scale, ScoringMethod.CORRECT_ANSWER)[0]).toMatch(
      /no right answer/,
    );
    expect(questionProblems(choice(), ScoringMethod.ALIGNMENT)[0]).toMatch(
      /have a right answer/,
    );
  });

  it("needs the role profile's answer on a scale", () => {
    const scale = normalizeQuestion({
      type: QuestionType.CHOICE_SCALE,
      stem: 'Which pace suits you?',
      options: [{ text: 'Steady' }, { text: 'Mixed' }, { text: 'Fast' }],
      employerValue: 4,
    });

    expect(questionProblems(scale, ScoringMethod.ALIGNMENT)).toEqual([
      "Set the role profile's answer to one of the scale values.",
    ]);
  });
});

describe('shufflesOptions', () => {
  it('follows the question, then the test, for single choice only', () => {
    expect(shufflesOptions(QuestionType.SINGLE_CHOICE, null, true)).toBe(true);
    expect(shufflesOptions(QuestionType.SINGLE_CHOICE, false, true)).toBe(
      false,
    );
    expect(shufflesOptions(QuestionType.TRUE_FALSE, true, true)).toBe(false);
    expect(shufflesOptions(QuestionType.RATING_SCALE, true, true)).toBe(false);
  });
});
