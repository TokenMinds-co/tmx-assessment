import { CsvError, parseCsv, toCsv } from '../../common/csv';
import {
  Difficulty,
  QuestionType,
  ScoringMethod,
} from '../../generated/prisma/enums';
import type { CanonicalOption, CanonicalQuestion } from './canonical.types';
import {
  isScale,
  MAX_SCALE_POINTS,
  MIN_SCALE_POINTS,
  normalizeQuestion,
  OPTION_LETTERS,
  questionProblems,
} from './question-rules';

/**
 * The question CSV format: one row per question, header row first. Staff fill
 * it in a spreadsheet and import it into a test. See docs/assessments.md.
 */
export const QUESTION_CSV_COLUMNS = [
  'ref',
  'section',
  'type',
  'difficulty',
  'instruction',
  'context',
  'stem',
  'media',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'option_e',
  'option_f',
  'correct',
  'rationale',
  'transcript',
  'shuffle_options',
  'keep_last_option_fixed',
  'scale_size',
  'scale_min_label',
  'scale_max_label',
  'employer_prompt',
  'employer_min_label',
  'employer_max_label',
  'employer_value',
] as const;

export type QuestionCsvColumn = (typeof QUESTION_CSV_COLUMNS)[number];

const OPTION_COLUMNS = [
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'option_e',
  'option_f',
] as const satisfies readonly QuestionCsvColumn[];

const DEFAULT_SCALE_SIZE = 5;
const COLUMN_SET: ReadonlySet<string> = new Set(QUESTION_CSV_COLUMNS);
const isColumn = (name: string): name is QuestionCsvColumn =>
  COLUMN_SET.has(name);

export interface CsvIssue {
  /** The spreadsheet row, where the header is row 1. Null for the whole file. */
  row: number | null;
  column: string | null;
  message: string;
}

export interface CsvQuestionRow {
  row: number;
  question: CanonicalQuestion;
}

export interface ParsedQuestionCsv {
  rows: CsvQuestionRow[];
  errors: CsvIssue[];
  warnings: CsvIssue[];
}

/**
 * Reads question rows for a test scored by `method`. Rows with problems are
 * left out of `rows` and described in `errors`, with the row and column, so a
 * preview can point at the cell to fix.
 */
export function parseQuestionCsv(
  text: string,
  method: ScoringMethod,
): ParsedQuestionCsv {
  const rows: CsvQuestionRow[] = [];
  const errors: CsvIssue[] = [];
  const warnings: CsvIssue[] = [];

  let records: string[][];
  try {
    records = parseCsv(text);
  } catch (error) {
    if (!(error instanceof CsvError)) throw error;
    return {
      rows,
      errors: [{ row: error.row, column: null, message: error.message }],
      warnings,
    };
  }

  const [header = [], ...data] = records;
  if (header.every((value) => !value.trim())) {
    errors.push({
      row: null,
      column: null,
      message: 'The file is empty. Download the template to see the columns.',
    });
    return { rows, errors, warnings };
  }

  const columns = new Map<QuestionCsvColumn, number>();
  header.forEach((raw, index) => {
    const name = raw
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    if (!name) return;
    if (!isColumn(name)) {
      warnings.push({
        row: 1,
        column: raw.trim(),
        message: `The column "${raw.trim()}" isn't one the import reads, so it's ignored.`,
      });
    } else if (columns.has(name)) {
      errors.push({
        row: 1,
        column: name,
        message: `The column "${name}" appears twice.`,
      });
    } else {
      columns.set(name, index);
    }
  });
  if (!columns.has('stem')) {
    errors.push({
      row: 1,
      column: 'stem',
      message: 'The file needs a "stem" column with the question text.',
    });
  }
  if (errors.length > 0) return { rows, errors, warnings };

  data.forEach((record, index) => {
    if (record.every((value) => !value.trim())) return;
    const row = index + 2;
    const cell = (column: QuestionCsvColumn): string => {
      const at = columns.get(column);
      return at === undefined ? '' : (record[at] ?? '').trim();
    };
    const issues: CsvIssue[] = [];
    const fail = (column: QuestionCsvColumn | null, message: string) =>
      issues.push({ row, column, message });

    const type = parseType(cell('type'), method);
    if (!type) {
      fail(
        'type',
        `"${cell('type')}" isn't a question type. Use single choice, true/false, rating scale or choice scale.`,
      );
    }
    const difficulty = parseDifficulty(cell('difficulty'));
    if (difficulty === undefined) {
      fail('difficulty', 'Use Easy, Medium or Hard, or leave it blank.');
    }
    const shuffleOptions = parseBoolean(cell('shuffle_options'));
    if (shuffleOptions === undefined) {
      fail(
        'shuffle_options',
        'Use yes or no, or leave it blank to follow the test.',
      );
    }
    const keepLast = parseBoolean(cell('keep_last_option_fixed'));
    if (keepLast === undefined) {
      fail('keep_last_option_fixed', 'Use yes or no, or leave it blank.');
    }
    const employerValue = parseInteger(cell('employer_value'));
    if (employerValue === undefined) {
      fail('employer_value', 'Use a whole number, such as 3.');
    }
    if (!cell('stem')) fail('stem', 'Write the question text.');

    let options: CanonicalOption[] = [];
    if (type === QuestionType.RATING_SCALE) {
      const size = cell('scale_size')
        ? parseInteger(cell('scale_size'))
        : DEFAULT_SCALE_SIZE;
      if (
        typeof size !== 'number' ||
        size < MIN_SCALE_POINTS ||
        size > MAX_SCALE_POINTS
      ) {
        fail(
          'scale_size',
          `Use a number from ${MIN_SCALE_POINTS} to ${MAX_SCALE_POINTS}.`,
        );
      } else {
        options = ratingScaleOptions(size, {
          min: cell('scale_min_label'),
          max: cell('scale_max_label'),
          employerMin: cell('employer_min_label'),
          employerMax: cell('employer_max_label'),
        });
      }
      if (OPTION_COLUMNS.some((column) => cell(column))) {
        warnings.push({
          row,
          column: 'option_a',
          message:
            'Rating scales use scale_size and the label columns, so the option columns are ignored.',
        });
      }
    } else if (type) {
      const texts = OPTION_COLUMNS.map((column) => cell(column));
      const filled = texts.slice(
        0,
        texts.findLastIndex((text) => text !== '') + 1,
      );
      const gap = filled.findIndex((text) => text === '');
      if (gap !== -1)
        fail(
          OPTION_COLUMNS[gap],
          'Fill in the options in order, without gaps.',
        );
      options = filled.map((text) => ({ text }));
      if (type === QuestionType.TRUE_FALSE && options.length === 0) {
        options = [{ text: 'True' }, { text: 'False' }];
      }

      const key = cell('correct');
      if (isScale(type)) {
        if (key) {
          warnings.push({
            row,
            column: 'correct',
            message:
              'Choice scales have no right answer, so "correct" is ignored.',
          });
        }
      } else if (!key) {
        fail('correct', 'Say which option is correct, such as B.');
      } else {
        const at = correctIndex(key, options, type);
        if (at === -1) {
          const last = OPTION_LETTERS[Math.max(options.length - 1, 0)];
          fail(
            'correct',
            `"${key}" doesn't match an option. Use a letter from A to ${last}.`,
          );
        } else {
          options = options.map((option, i) => ({
            ...option,
            correct: i === at,
          }));
        }
      }
    }

    if (issues.length === 0 && type) {
      const question = normalizeQuestion({
        ref: cell('ref'),
        section: cell('section'),
        type,
        difficulty,
        instruction: cell('instruction'),
        context: cell('context'),
        stem: cell('stem'),
        media: { file: cell('media') },
        options,
        rationale: cell('rationale'),
        transcript: cell('transcript'),
        shuffleOptions,
        keepLastOptionFixed: keepLast ?? false,
        employerPrompt: cell('employer_prompt'),
        employerValue,
      });
      for (const problem of questionProblems(question, method))
        fail(null, problem);
      if (issues.length === 0) rows.push({ row, question });
    }
    errors.push(...issues);
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push({
      row: null,
      column: null,
      message: 'The file has no questions under the header row.',
    });
  }
  return { rows, errors, warnings };
}

/** Header plus one row per question, ready to open in a spreadsheet. */
export function questionsToCsv(
  questions: readonly CanonicalQuestion[],
): string {
  return toCsv([[...QUESTION_CSV_COLUMNS], ...questions.map(questionRow)]);
}

/** A header and example rows for the question types a test can hold. */
export function questionCsvTemplate(method: ScoringMethod): string {
  return questionsToCsv(
    (method === ScoringMethod.ALIGNMENT
      ? ALIGNMENT_EXAMPLES
      : CORRECT_ANSWER_EXAMPLES
    ).map(normalizeQuestion),
  );
}

/** The points of a rating scale, labelled at both ends. */
export function ratingScaleOptions(
  size: number,
  labels: {
    min?: string;
    max?: string;
    employerMin?: string;
    employerMax?: string;
  } = {},
): CanonicalOption[] {
  return Array.from({ length: size }, (_, index) => {
    const first = index === 0;
    const last = index === size - 1;
    return {
      value: index + 1,
      text: (first ? labels.min : last ? labels.max : '') ?? '',
      employerText:
        (first ? labels.employerMin : last ? labels.employerMax : '') || null,
    };
  });
}

function questionRow(question: CanonicalQuestion): string[] {
  const values = new Map<QuestionCsvColumn, string>();
  const set = (
    column: QuestionCsvColumn,
    value: string | number | null | undefined,
  ) => {
    if (value !== null && value !== undefined && value !== '')
      values.set(column, String(value));
  };

  set('ref', question.ref);
  set('section', question.section);
  set('type', question.type.toLowerCase());
  set(
    'difficulty',
    question.difficulty ? capitalize(question.difficulty) : null,
  );
  set('instruction', question.instruction);
  set('context', question.context);
  set('stem', question.stem);
  set('media', question.media?.file);
  set('rationale', question.rationale);
  set('transcript', question.transcript);
  if (typeof question.shuffleOptions === 'boolean') {
    set('shuffle_options', question.shuffleOptions ? 'yes' : 'no');
  }
  if (question.keepLastOptionFixed) set('keep_last_option_fixed', 'yes');
  set('employer_prompt', question.employerPrompt);
  set('employer_value', question.employerValue);

  const { options } = question;
  if (question.type === QuestionType.RATING_SCALE) {
    set('scale_size', options.length);
    set('scale_min_label', options[0]?.text);
    set('scale_max_label', options.at(-1)?.text);
    set('employer_min_label', options[0]?.employerText);
    set('employer_max_label', options.at(-1)?.employerText);
  } else {
    options.forEach((option, index) => {
      const column = OPTION_COLUMNS[index];
      if (column) set(column, option.text);
    });
    const correct = options.findIndex((option) => option.correct);
    if (correct !== -1 && !isScale(question.type))
      set('correct', OPTION_LETTERS[correct]);
  }
  return QUESTION_CSV_COLUMNS.map((column) => values.get(column) ?? '');
}

function parseType(
  raw: string,
  method: ScoringMethod,
): QuestionType | undefined {
  if (!raw) {
    return method === ScoringMethod.ALIGNMENT
      ? QuestionType.RATING_SCALE
      : QuestionType.SINGLE_CHOICE;
  }
  // Accepts the enum names and the workbooks' wording, such as "Rating 1–5".
  const key = raw
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim();
  if (/^((single|multiple) choice|mcq)$/.test(key))
    return QuestionType.SINGLE_CHOICE;
  if (/^(true false|true or false|tf)$/.test(key))
    return QuestionType.TRUE_FALSE;
  if (key.startsWith('rating')) return QuestionType.RATING_SCALE;
  if (key.startsWith('choice')) return QuestionType.CHOICE_SCALE;
  return undefined;
}

/** Undefined means the value is there but invalid; null means blank. */
function parseDifficulty(raw: string): Difficulty | null | undefined {
  if (!raw) return null;
  const key = raw.toUpperCase();
  return (Object.values(Difficulty) as string[]).includes(key)
    ? (key as Difficulty)
    : undefined;
}

function parseBoolean(raw: string): boolean | null | undefined {
  if (!raw) return null;
  if (/^(y|yes|true|1)$/i.test(raw)) return true;
  if (/^(n|no|false|0)$/i.test(raw)) return false;
  return undefined;
}

function parseInteger(raw: string): number | null | undefined {
  if (!raw) return null;
  return /^-?\d+$/.test(raw) ? Number(raw) : undefined;
}

/** A letter, True/False, or the exact option text. -1 when nothing matches. */
function correctIndex(
  raw: string,
  options: CanonicalOption[],
  type: QuestionType,
): number {
  if (type === QuestionType.TRUE_FALSE) {
    if (/^(t|true)$/i.test(raw)) return 0;
    if (/^(f|false)$/i.test(raw)) return 1;
  }
  if (/^[a-f]$/i.test(raw)) {
    const index = raw.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
    return index < options.length ? index : -1;
  }
  return options.findIndex(
    (option) => option.text.toLowerCase() === raw.toLowerCase(),
  );
}

function capitalize(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

const CORRECT_ANSWER_EXAMPLES: CanonicalQuestion[] = [
  {
    ref: 'Q1',
    section: 'Written communication',
    type: QuestionType.SINGLE_CHOICE,
    difficulty: Difficulty.EASY,
    context:
      '"Thanks for the proposal. The budget is higher than we can commit to this quarter. Could we start with a smaller first phase?"',
    stem: 'What is the main point of the message?',
    options: [
      { text: 'The sender is rejecting the proposal.' },
      { text: 'The sender wants a smaller first phase.', correct: true },
      {
        text: 'The sender thinks the proposal is going in the wrong direction.',
      },
      { text: 'The sender wants to delay all work.' },
    ],
    rationale: 'Tests reading past a partial negative to the actual request.',
  },
  {
    ref: 'Q2',
    section: 'Reading comprehension',
    type: QuestionType.TRUE_FALSE,
    context:
      'Ben has been on the phone all morning and could really use a break.',
    stem: 'True or False: Ben would like to stop working for a short time.',
    options: [{ text: 'True', correct: true }, { text: 'False' }],
  },
  {
    ref: 'Q3',
    section: 'Listening comprehension',
    type: QuestionType.SINGLE_CHOICE,
    difficulty: Difficulty.MEDIUM,
    stem: 'When is the client meeting now?',
    media: { file: 'listening_Q13.mp3' },
    options: [
      { text: 'Tuesday at 10' },
      { text: 'Wednesday at 10' },
      { text: 'Tuesday at 2' },
      { text: 'Wednesday at 2', correct: true },
    ],
    transcript:
      'The client meeting has moved from Tuesday at ten to Wednesday at two.',
  },
];

const ALIGNMENT_EXAMPLES: CanonicalQuestion[] = [
  {
    ref: 'Q1',
    section: 'Core job characteristics',
    type: QuestionType.RATING_SCALE,
    stem: 'How important is it to you that a job lets you use many different skills?',
    employerPrompt:
      'To what extent does this role require a variety of different skills?',
    options: ratingScaleOptions(5, {
      min: 'Not important',
      max: 'Extremely important',
      employerMin: 'Not at all',
      employerMax: 'To a very large extent',
    }),
    employerValue: 3,
  },
  {
    ref: 'Q2',
    section: 'Work activities',
    type: QuestionType.CHOICE_SCALE,
    stem: 'Which pace of work suits you best?',
    employerPrompt: 'Which best describes the pace of this role?',
    options: [
      { text: 'Steady and predictable' },
      { text: 'A mix of busy and calm periods' },
      { text: 'Fast-changing, with frequent urgent work' },
    ],
    employerValue: 2,
  },
];
