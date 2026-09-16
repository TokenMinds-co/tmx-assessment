"use client";

import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  type AssessmentDetail,
  createSection,
  deleteSection,
  reorderSections,
  type Section,
  updateSection,
} from "@/lib/api/assessments";
import { errorMessage } from "@/lib/api/client";
import { plural } from "@/lib/format";
import { useAssessmentMutation } from "./use-assessment-mutation";

/** Adds, renames, orders and deletes a test's sections. */
export function SectionsSheet({
  assessment,
  open,
  onOpenChange,
}: {
  assessment: AssessmentDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const reorder = useAssessmentMutation(assessment.id, (ids: string[]) => reorderSections(assessment.id, ids));

  function move(sectionId: string, direction: -1 | 1) {
    const index = assessment.sections.findIndex((section) => section.id === sectionId);
    const neighbour = assessment.sections[index + direction];
    if (!neighbour) return;
    reorder.mutate(
      assessment.sections.map((section) =>
        section.id === sectionId ? neighbour.id : section.id === neighbour.id ? sectionId : section.id,
      ),
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Sections</SheetTitle>
          <SheetDescription>
            {assessment.scoringMethod === "ALIGNMENT"
              ? "Each section is a dimension of the fit score. Set their weights on the Scoring tab."
              : "Group questions by skill. Results show a score for each section."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {assessment.sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sections yet. A test works without them too.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {assessment.sections.map((section, index) => (
                <SectionRow
                  key={section.id}
                  assessmentId={assessment.id}
                  section={section}
                  number={index + 1}
                  canMoveUp={index > 0 && !reorder.isPending}
                  canMoveDown={index < assessment.sections.length - 1 && !reorder.isPending}
                  onMove={(direction) => move(section.id, direction)}
                />
              ))}
            </ol>
          )}
          <AddSection assessmentId={assessment.id} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionRow({
  assessmentId,
  section,
  number,
  canMoveUp,
  canMoveDown,
  onMove,
}: {
  assessmentId: string;
  section: Section;
  number: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  const [name, setName] = useState(section.name);
  const [description, setDescription] = useState(section.description ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useAssessmentMutation(assessmentId, () =>
    updateSection(assessmentId, section.id, { name: name.trim(), description: description.trim() || null }),
  );
  const remove = useAssessmentMutation(assessmentId, () => deleteSection(assessmentId, section.id));

  const dirty = name.trim() !== section.name || (description.trim() || null) !== section.description;

  return (
    <li className="flex flex-col gap-2 rounded-lg border bg-card p-3">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label={`Section ${number} name`}
            aria-invalid={name.trim() ? undefined : true}
            className="h-9 font-medium"
          />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            placeholder="Description, for staff. Optional."
            aria-label={`Section ${number} description`}
            className="min-h-0 text-sm"
          />
          <p className="text-xs text-muted-foreground">{plural(section.questionCount, "question")}</p>
        </div>
        <div className="flex flex-col">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!canMoveUp}
            onClick={() => onMove(-1)}
            aria-label={`Move ${section.name} up`}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!canMoveDown}
            onClick={() => onMove(1)}
            aria-label={`Move ${section.name} down`}
          >
            <ArrowDownIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setConfirmDelete(true)}
            aria-label={`Delete ${section.name}`}
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>
      {dirty ? (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setName(section.name);
              setDescription(section.description ?? "");
            }}
          >
            Undo
          </Button>
          <Button
            size="sm"
            disabled={!name.trim() || save.isPending}
            onClick={() => save.mutate(undefined, { onSuccess: () => toast.success("Section saved") })}
          >
            {save.isPending ? <Spinner data-icon="inline-start" /> : null}
            Save
          </Button>
        </div>
      ) : null}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{section.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {section.questionCount > 0
                ? `Its ${plural(section.questionCount, "question")} stay in the test, without a section.`
                : "It has no questions."}
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
                    toast.success("Section deleted");
                  },
                });
              }}
            >
              Delete section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

function AddSection({ assessmentId }: { assessmentId: string }) {
  const [name, setName] = useState("");
  const [missing, setMissing] = useState(false);
  const create = useAssessmentMutation(
    assessmentId,
    (value: string) => createSection(assessmentId, { name: value }),
    { toastErrors: false },
  );
  const error = missing ? "Name the section." : create.error ? errorMessage(create.error) : undefined;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const value = name.trim();
        setMissing(!value);
        if (!value) return;
        create.mutate(value, {
          onSuccess: () => {
            setName("");
            toast.success(`Added “${value}”`);
          },
        });
      }}
      className="rounded-lg border border-dashed p-3"
    >
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="new-section-name">New section</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="new-section-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Listening"
            autoComplete="off"
            aria-invalid={error ? true : undefined}
          />
          <Button type="submit" variant="outline" disabled={create.isPending}>
            {create.isPending ? <Spinner data-icon="inline-start" /> : null}
            Add
          </Button>
        </div>
        <FieldDescription>Questions pick their section when you edit them.</FieldDescription>
        <FieldError>{error}</FieldError>
      </Field>
    </form>
  );
}
