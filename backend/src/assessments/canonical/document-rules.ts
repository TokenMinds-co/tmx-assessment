import type { CanonicalAssessment } from './canonical.types';
import { normalizeQuestion, questionProblems } from './question-rules';

/** How a question is named in messages: "Question 3 (Q5)". */
export function questionName(index: number, ref?: string | null): string {
  return `Question ${index + 1}${ref ? ` (${ref})` : ''}`;
}

/**
 * Everything that stops a canonical document from being imported: question
 * problems, unknown sections, duplicate section keys and duplicate bands.
 */
export function documentProblems(document: CanonicalAssessment): string[] {
  const problems: string[] = [];

  const keys = new Set<string>();
  for (const section of document.sections) {
    for (const name of new Set(
      [section.key, section.name].map((v) => v.toLowerCase()),
    )) {
      if (keys.has(name)) problems.push(`Two sections are called "${name}".`);
      keys.add(name);
    }
  }

  document.questions.forEach((raw, index) => {
    const question = normalizeQuestion(raw);
    const name = questionName(index, question.ref);
    if (question.section && !keys.has(question.section.toLowerCase())) {
      problems.push(
        `${name}: there's no section called "${question.section}".`,
      );
    }
    for (const problem of questionProblems(question, document.scoringMethod)) {
      problems.push(`${name}: ${problem}`);
    }
  });

  const minimums = document.bands.map((band) => band.minScore);
  if (new Set(minimums).size !== minimums.length) {
    problems.push('Two score bands start at the same score.');
  }
  return problems;
}
