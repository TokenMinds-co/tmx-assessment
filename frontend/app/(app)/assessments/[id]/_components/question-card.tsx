"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  CopyPlusIcon,
  EllipsisIcon,
  FileAudioIcon,
  PencilIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { EASE_OUT } from "@/components/shared/runner-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type AssessmentDetail, deleteQuestion, duplicateQuestion, type Question } from "@/lib/api/assessments";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABELS, isScaleType, LETTERS, TYPE_LABELS } from "./question-draft";
import { QuestionForm } from "./question-form";
import { useAssessmentMutation } from "./use-assessment-mutation";

/** One question in the list. Admins open it in place to edit. */
export function QuestionCard({
  assessment,
  question,
  number,
  isAdmin,
  editing,
  onEdit,
  onClose,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  assessment: AssessmentDetail;
  question: Question;
  /** Its place in the whole test, from 1. */
  number: number;
  isAdmin: boolean;
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onMove: (direction: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const section = assessment.sections.find((item) => item.id === question.sectionId);

  return (
    <motion.li
      layout={reduceMotion ? false : "position"}
      transition={{ duration: 0.28, ease: EASE_OUT }}
      aria-label={`Question ${number}`}
      className={cn(
        "rounded-xl border bg-card shadow-xs transition-[border-color,box-shadow]",
        editing && "border-primary/50 ring-3 ring-primary/10",
      )}
    >
      <div className="flex items-start gap-3 px-4 pt-4 pb-2 sm:px-5">
        <span className="mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-md bg-secondary px-1.5 text-xs font-semibold text-muted-foreground tabular-nums">
          {number}
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {question.ref ? <Badge variant="outline">{question.ref}</Badge> : null}
          <Badge variant="secondary">{TYPE_LABELS[question.type]}</Badge>
          {section ? <Badge variant="soft">{section.name}</Badge> : null}
          {question.difficulty ? (
            <span className="text-xs text-muted-foreground">{DIFFICULTY_LABELS[question.difficulty]}</span>
          ) : null}
          {question.media ? (
            <Badge variant="info">
              <FileAudioIcon data-icon="inline-start" aria-hidden="true" />
              Audio
            </Badge>
          ) : question.mediaFileName ? (
            <Badge variant="warning">
              <TriangleAlertIcon data-icon="inline-start" aria-hidden="true" />
              Needs audio
            </Badge>
          ) : null}
        </div>
        {isAdmin && !editing ? (
          <QuestionActions
            assessmentId={assessment.id}
            question={question}
            number={number}
            onEdit={onEdit}
            onMove={onMove}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
          />
        ) : null}
      </div>

      {editing ? (
        <div className="px-4 pt-2 pb-4 sm:px-5 sm:pb-5">
          <QuestionForm assessment={assessment} question={question} onDone={onClose} />
        </div>
      ) : (
        <div
          className={cn("flex flex-col gap-3 px-4 pb-4 sm:px-5", isAdmin && "cursor-pointer")}
          onClick={isAdmin ? onEdit : undefined}
        >
          {question.instruction ? (
            <p className="text-xs font-medium text-muted-foreground">{question.instruction}</p>
          ) : null}
          {question.context ? (
            <p className="line-clamp-3 rounded-lg bg-secondary/60 px-3 py-2 text-sm whitespace-pre-line text-muted-foreground">
              {question.context}
            </p>
          ) : null}
          <p className="text-[15px] leading-snug font-medium whitespace-pre-line text-foreground">{question.stem}</p>
          {question.employerPrompt ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Role profile asks:</span> {question.employerPrompt}
            </p>
          ) : null}
          <OptionSummary question={question} />
        </div>
      )}
    </motion.li>
  );
}

function QuestionActions({
  assessmentId,
  question,
  number,
  onEdit,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  assessmentId: string;
  question: Question;
  number: number;
  onEdit: () => void;
  onMove: (direction: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const duplicate = useAssessmentMutation(assessmentId, () => duplicateQuestion(assessmentId, question.id));
  const remove = useAssessmentMutation(assessmentId, () => deleteQuestion(assessmentId, question.id));

  return (
    <div className="-mt-1 -mr-2 flex shrink-0 items-center">
      <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit question ${number}`}>
        <PencilIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={!canMoveUp}
        onClick={() => onMove(-1)}
        aria-label={`Move question ${number} up`}
      >
        <ArrowUpIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={!canMoveDown}
        onClick={() => onMove(1)}
        aria-label={`Move question ${number} down`}
      >
        <ArrowDownIcon />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`More actions for question ${number}`}>
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem
            disabled={duplicate.isPending}
            onSelect={() =>
              duplicate.mutate(undefined, { onSuccess: () => toast.success("Copied. The copy is right after it.") })
            }
          >
            <CopyPlusIcon />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete question {number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Candidates who were already sent this test keep their copy. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                remove.mutate(undefined, {
                  onSuccess: () => {
                    setConfirmDelete(false);
                    toast.success("Question deleted");
                  },
                });
              }}
            >
              Delete question
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** The options at a glance, with the right answer or the role's pick marked. */
function OptionSummary({ question }: { question: Question }) {
  if (isScaleType(question.type)) {
    return (
      <ol className="flex flex-wrap gap-1.5" aria-label="Scale">
        {question.options.map((option) => {
          const picked = option.value !== null && option.value === question.employerValue;
          return (
            <li
              key={option.id}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
                picked ? "border-primary/40 bg-primary-soft font-medium text-primary" : "text-muted-foreground",
              )}
            >
              <span className="font-semibold tabular-nums">{option.value}</span>
              {option.text ? <span>{option.text}</span> : null}
              {picked ? <span className="sr-only">, fits the role</span> : null}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className="grid gap-1 sm:grid-cols-2" aria-label="Options">
      {question.options.map((option, index) => (
        <li
          key={option.id}
          className={cn(
            "flex items-start gap-2 rounded-md px-2 py-1.5 text-sm",
            option.isCorrect ? "bg-success-soft font-medium text-success" : "text-muted-foreground",
          )}
        >
          <span className="w-4 shrink-0 font-semibold">{option.label || LETTERS[index]}</span>
          <span className="min-w-0 flex-1">{option.text}</span>
          {option.isCorrect ? (
            <>
              <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span className="sr-only">, the right answer</span>
            </>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
