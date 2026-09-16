"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDownIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  ListChecksIcon,
  ListTreeIcon,
  PlusIcon,
  UploadIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { EASE_OUT } from "@/components/shared/runner-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type AssessmentDetail, csvTemplateUrl, exportCsvUrl, reorderQuestions } from "@/lib/api/assessments";
import { errorMessage } from "@/lib/api/client";
import { plural } from "@/lib/format";
import { assessmentKeys } from "@/lib/query-keys";
import { CsvImportDialog } from "./csv-import-dialog";
import { QuestionCard } from "./question-card";
import { QuestionForm } from "./question-form";
import { SectionsSheet } from "./sections-sheet";

const ALL = "all";
const NO_SECTION = "none";

/** Brings the new-question form into view when it opens. Stable, so it runs once. */
function scrollIntoView(node: HTMLElement | null) {
  node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/** The test's questions: read, filter by section, edit in place, reorder and import. */
export function QuestionsTab({ assessment, isAdmin }: { assessment: AssessmentDetail; isAdmin: boolean }) {
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState(ALL);
  const [editing, setEditing] = useState<ReadonlySet<string>>(() => new Set());
  const [adding, setAdding] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const reorder = useReorderQuestions(assessment.id);

  // The filter may point at a section that was just deleted.
  const activeFilter =
    filter === ALL || filter === NO_SECTION || assessment.sections.some((section) => section.id === filter)
      ? filter
      : ALL;
  const visible = assessment.questions.filter((question) =>
    activeFilter === ALL
      ? true
      : activeFilter === NO_SECTION
        ? question.sectionId === null
        : question.sectionId === activeFilter,
  );
  const numberOf = new Map(assessment.questions.map((question, index) => [question.id, index + 1]));
  const unsectioned = assessment.questions.filter((question) => question.sectionId === null).length;
  const filterSectionId = activeFilter === ALL || activeFilter === NO_SECTION ? null : activeFilter;

  const open = (id: string) => setEditing((current) => new Set(current).add(id));
  const close = (id: string) =>
    setEditing((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });

  /** Swaps a question with its neighbour in the list as filtered. */
  function move(questionId: string, direction: -1 | 1) {
    const index = visible.findIndex((question) => question.id === questionId);
    const neighbour = visible[index + direction];
    if (!neighbour) return;
    const ids = assessment.questions.map((question) =>
      question.id === questionId ? neighbour.id : question.id === neighbour.id ? questionId : question.id,
    );
    reorder.mutate(ids);
    setAnnouncement(`Moved to position ${ids.indexOf(questionId) + 1} of ${ids.length}.`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {assessment.sections.length > 0 ? (
          <Select value={activeFilter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-72" aria-label="Show questions from">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sections · {assessment.questions.length}</SelectItem>
              {assessment.sections.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  {section.name} · {section.questionCount}
                </SelectItem>
              ))}
              {unsectioned > 0 ? <SelectItem value={NO_SECTION}>No section · {unsectioned}</SelectItem> : null}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground">{plural(assessment.questions.length, "question")}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {isAdmin ? (
            <Button variant="outline" onClick={() => setSectionsOpen(true)}>
              <ListTreeIcon data-icon="inline-start" />
              Sections
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileSpreadsheetIcon data-icon="inline-start" />
                CSV
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              {isAdmin ? (
                <DropdownMenuItem onSelect={() => setImportOpen(true)}>
                  <UploadIcon />
                  Import questions
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild>
                <a href={exportCsvUrl(assessment.id)} download>
                  <DownloadIcon />
                  Export questions
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={csvTemplateUrl(assessment.scoringMethod)} download>
                  <DownloadIcon />
                  Download the template
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isAdmin ? (
            <Button onClick={() => setAdding(true)} disabled={adding}>
              <PlusIcon data-icon="inline-start" />
              Add question
            </Button>
          ) : null}
        </div>
      </div>

      {assessment.questions.length === 0 && !adding ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecksIcon />
            </EmptyMedia>
            <EmptyTitle>No questions yet</EmptyTitle>
            <EmptyDescription>
              {isAdmin
                ? "Add them one at a time, or import a spreadsheet of questions."
                : "An admin adds the questions."}
            </EmptyDescription>
          </EmptyHeader>
          {isAdmin ? (
            <EmptyContent>
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setAdding(true)}>
                  <PlusIcon data-icon="inline-start" />
                  Add question
                </Button>
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <UploadIcon data-icon="inline-start" />
                  Import CSV
                </Button>
              </div>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <ol className="flex flex-col gap-3">
          {visible.map((question, index) => (
            <QuestionCard
              key={question.id}
              assessment={assessment}
              question={question}
              number={numberOf.get(question.id) ?? index + 1}
              isAdmin={isAdmin}
              editing={editing.has(question.id)}
              onEdit={() => open(question.id)}
              onClose={() => close(question.id)}
              onMove={(direction) => move(question.id, direction)}
              canMoveUp={index > 0}
              canMoveDown={index < visible.length - 1}
            />
          ))}
          {visible.length === 0 && !adding ? (
            <li className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No questions in this section yet.
            </li>
          ) : null}
          <AnimatePresence initial={false}>
            {adding ? (
              <motion.li
                key="new-question"
                ref={scrollIntoView}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
                transition={{ duration: 0.26, ease: EASE_OUT }}
                aria-label="New question"
                className="scroll-mb-6 rounded-xl border border-primary/50 bg-card p-4 shadow-xs ring-3 ring-primary/10 sm:p-5"
              >
                <p className="mb-4 text-sm font-semibold text-foreground">
                  New question {assessment.questions.length + 1}
                </p>
                <QuestionForm
                  assessment={assessment}
                  question={null}
                  defaultSectionId={filterSectionId}
                  onDone={() => setAdding(false)}
                />
              </motion.li>
            ) : null}
          </AnimatePresence>
        </ol>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {isAdmin ? (
        <>
          <SectionsSheet assessment={assessment} open={sectionsOpen} onOpenChange={setSectionsOpen} />
          <CsvImportDialog assessment={assessment} open={importOpen} onOpenChange={setImportOpen} />
        </>
      ) : null}
    </div>
  );
}

/**
 * Moves show at once. Quick moves overlap, so only the last answer to arrive
 * is written back, as it's the newest (tkdodo's concurrent optimistic updates).
 */
function useReorderQuestions(assessmentId: string) {
  const queryClient = useQueryClient();
  const detailKey = assessmentKeys.detail(assessmentId);
  const mutationKey = [...detailKey, "reorder"];

  return useMutation({
    mutationKey,
    mutationFn: (ids: string[]) => reorderQuestions(assessmentId, ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<AssessmentDetail>(detailKey);
      if (previous) {
        const byId = new Map(previous.questions.map((question) => [question.id, question]));
        queryClient.setQueryData<AssessmentDetail>(detailKey, {
          ...previous,
          questions: ids.flatMap((id, order) => {
            const question = byId.get(id);
            return question ? [{ ...question, order }] : [];
          }),
        });
      }
      return { previous };
    },
    onError: (error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous);
      toast.error(errorMessage(error));
    },
    onSuccess: (detail) => {
      if (queryClient.isMutating({ mutationKey }) === 1) queryClient.setQueryData(detailKey, detail);
    },
  });
}
