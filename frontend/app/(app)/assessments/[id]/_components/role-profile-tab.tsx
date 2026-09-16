"use client";

import { InfoIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { type AssessmentDetail, type Question, updateQuestion } from "@/lib/api/assessments";
import { draftFromQuestion, isScaleType, toInput } from "./question-draft";
import { useAssessmentMutation } from "./use-assessment-mutation";

/**
 * The answers that fit the role, one per scale question. Each pick saves at
 * once. Candidates are compared with the profile as it was when they were sent
 * the test.
 */
export function RoleProfileTab({ assessment, isAdmin }: { assessment: AssessmentDetail; isAdmin: boolean }) {
  const numberOf = new Map(assessment.questions.map((question, index) => [question.id, index + 1]));
  const scales = assessment.questions.filter((question) => isScaleType(question.type));
  const groups = [
    ...assessment.sections.map((section) => ({
      key: section.id,
      name: section.name,
      questions: scales.filter((question) => question.sectionId === section.id),
    })),
    { key: "none", name: "No section", questions: scales.filter((question) => question.sectionId === null) },
  ].filter((group) => group.questions.length > 0);
  const answered = scales.filter((question) => question.employerValue !== null).length;

  return (
    <div className="flex flex-col gap-6">
      <Alert variant="info">
        <InfoIcon />
        <AlertTitle>
          The answers that fit this role. {answered} of {scales.length} set.
        </AlertTitle>
        <AlertDescription>
          Candidates score higher the closer they come. People already sent the test keep the profile they were
          sent with. Profiles for each job come later, with Jobs.
        </AlertDescription>
      </Alert>

      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">{group.name}</h2>
          <ol className="flex flex-col gap-3">
            {group.questions.map((question) => (
              <ProfileRow
                key={question.id}
                assessmentId={assessment.id}
                question={question}
                number={numberOf.get(question.id) ?? 0}
                isAdmin={isAdmin}
              />
            ))}
          </ol>
        </section>
      ))}

      {scales.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add rating or choice scale questions to set a profile.</p>
      ) : null}
    </div>
  );
}

function ProfileRow({
  assessmentId,
  question,
  number,
  isAdmin,
}: {
  assessmentId: string;
  question: Question;
  number: number;
  isAdmin: boolean;
}) {
  const save = useAssessmentMutation(assessmentId, (employerValue: number) =>
    updateQuestion(assessmentId, question.id, { ...toInput(draftFromQuestion(question)), employerValue }),
  );
  // The pick shows straight away and falls back if the save fails.
  const value = save.isPending ? save.variables : question.employerValue;
  const prompt = question.employerPrompt ?? question.stem;

  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-md bg-secondary px-1.5 text-xs font-semibold text-muted-foreground tabular-nums">
          {number}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[15px] leading-snug font-medium text-foreground">{prompt}</p>
          {question.employerPrompt ? (
            <p className="text-xs text-muted-foreground">Candidates see: {question.stem}</p>
          ) : null}
        </div>
        {save.isPending ? <Spinner className="mt-1 text-muted-foreground" aria-label="Saving" /> : null}
      </div>
      <RadioGroup
        value={value === null || value === undefined ? "" : String(value)}
        onValueChange={(next) =>
          save.mutate(Number(next), { onSuccess: () => toast.success(`Question ${number} saved`) })
        }
        disabled={!isAdmin}
        aria-label={`The answer that fits the role for question ${number}`}
        className="flex flex-wrap gap-2"
      >
        {question.options.map((option) =>
          option.value === null ? null : (
            <label
              key={option.id}
              className="flex min-h-11 flex-1 basis-28 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary/60 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft has-[:disabled]:cursor-default"
            >
              <RadioGroupItem value={String(option.value)} />
              <span className="font-semibold tabular-nums">{option.value}</span>
              <span className="min-w-0 text-muted-foreground">{option.employerText ?? option.text}</span>
            </label>
          ),
        )}
      </RadioGroup>
    </li>
  );
}
