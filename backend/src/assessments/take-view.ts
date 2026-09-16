import { mediaUrl } from '../media/dto/media-response.dto';
import type { AttemptLayout } from './canonical/layout';
import { isScale } from './canonical/question-rules';
import type { AssessmentSnapshot } from './canonical/snapshot';
import type {
  AnswerKeyDto,
  TakeQuestionDto,
  TakeSettingsDto,
} from './dto/take-response.dto';

/*
 * Turns a snapshot into what a candidate sees. Every field is picked by hand,
 * so keys, rationale, transcripts, difficulty, refs, the role profile and
 * section names never leave the server (take-view.spec.ts checks this).
 */

export function takeQuestions(
  snapshot: AssessmentSnapshot,
  layout: AttemptLayout,
): TakeQuestionDto[] {
  const byId = new Map(
    snapshot.questions.map((question) => [question.id, question]),
  );
  return layout.questions.flatMap((entry, index): TakeQuestionDto[] => {
    const question = byId.get(entry.questionId);
    if (!question) return [];
    const options = new Map(
      question.options.map((option) => [option.id, option]),
    );
    return [
      {
        id: question.id,
        number: index + 1,
        type: question.type,
        instruction: question.instruction,
        context: question.context,
        stem: question.stem,
        media: question.media
          ? {
              url: mediaUrl(question.media.id),
              mimeType: question.media.mimeType,
            }
          : null,
        options: entry.optionIds.flatMap((id) => {
          const option = options.get(id);
          return option ? [{ id: option.id, text: option.text }] : [];
        }),
      },
    ];
  });
}

export function takeSettings(snapshot: AssessmentSnapshot): TakeSettingsDto {
  return {
    allowBackNavigation: snapshot.allowBackNavigation,
    audioReplays: snapshot.audioReplays,
    scoringMethod: snapshot.scoringMethod,
  };
}

/** The right option, or the role profile's option on a scale, for each question. */
export function answerKey(snapshot: AssessmentSnapshot): AnswerKeyDto[] {
  return snapshot.questions.flatMap((question): AnswerKeyDto[] => {
    const option = isScale(question.type)
      ? question.options.find((o) => o.value === question.employerValue)
      : question.options.find((o) => o.isCorrect);
    return option
      ? [
          {
            questionId: question.id,
            optionId: option.id,
            kind: isScale(question.type) ? 'ROLE_PROFILE' : 'CORRECT',
          },
        ]
      : [];
  });
}
