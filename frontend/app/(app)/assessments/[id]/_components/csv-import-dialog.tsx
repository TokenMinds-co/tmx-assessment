"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleAlertIcon, CircleCheckIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FileDrop } from "@/components/shared/file-drop";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  type AssessmentDetail,
  csvTemplateUrl,
  type CsvIssue,
  type ImportMode,
  importQuestionsCsv,
  type QuestionImportResult,
} from "@/lib/api/assessments";
import { errorMessage } from "@/lib/api/client";
import { plural } from "@/lib/format";
import { assessmentKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { TYPE_LABELS } from "./question-draft";

/** The API's limit, checked here too so a big file fails before it uploads. */
const MAX_CSV_BYTES = 1024 * 1024;
const PREVIEW_ROWS = 50;
const ISSUES_SHOWN = 20;
const WIDE_ONLY = "hidden md:table-cell";

/**
 * Imports questions from a spreadsheet. The file is checked as soon as it's
 * chosen, so problems show by row before anything is saved.
 */
export function CsvImportDialog({
  assessment,
  open,
  onOpenChange,
}: {
  assessment: AssessmentDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        {open ? <CsvImport assessment={assessment} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

interface ImportRequest {
  file: File;
  mode: ImportMode;
  dryRun: boolean;
}

function CsvImport({ assessment, onDone }: { assessment: AssessmentDetail; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ImportMode>("append");
  const [tooBig, setTooBig] = useState(false);
  const [checked, setChecked] = useState<QuestionImportResult | null>(null);

  const check = useMutation({
    mutationFn: ({ file: csv, mode: how }: Omit<ImportRequest, "dryRun">) =>
      importQuestionsCsv(assessment.id, csv, { mode: how, dryRun: true }),
  });
  const commit = useMutation({
    mutationFn: ({ file: csv, mode: how }: Omit<ImportRequest, "dryRun">) =>
      importQuestionsCsv(assessment.id, csv, { mode: how, dryRun: false }),
    onSuccess: (result) => {
      if (result.assessment) queryClient.setQueryData(assessmentKeys.detail(assessment.id), result.assessment);
      void queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
      toast.success(`Imported ${plural(result.importedCount, "question")}`);
      onDone();
    },
  });

  function runCheck(next: File, how: ImportMode) {
    setChecked(null);
    // Only the latest check's answer counts when two overlap.
    check.mutate({ file: next, mode: how }, { onSuccess: setChecked });
  }

  function choose(next: File | null) {
    setFile(next);
    setChecked(null);
    check.reset();
    commit.reset();
    const big = next !== null && next.size > MAX_CSV_BYTES;
    setTooBig(big);
    if (next && !big) runCheck(next, mode);
  }

  function changeMode(next: ImportMode) {
    setMode(next);
    commit.reset();
    if (file && !tooBig) runCheck(file, next);
  }

  const failure = tooBig
    ? "That file is over 1 MB. Split it into smaller files."
    : check.error
      ? errorMessage(check.error)
      : commit.error
        ? errorMessage(commit.error)
        : undefined;
  const ready = checked !== null && checked.errors.length === 0 && checked.rowCount > 0;
  const errorRows = new Set(checked?.errors.map((issue) => issue.row) ?? []);
  const existing = assessment.questions.length;

  return (
    <div className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Import questions</DialogTitle>
        <DialogDescription>
          One question per row, in the template’s columns.{" "}
          <a
            href={csvTemplateUrl(assessment.scoringMethod)}
            download
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Download the template
          </a>
        </DialogDescription>
      </DialogHeader>

      <FileDrop accept=".csv,text/csv" file={file} onFile={choose} hint="A .csv file up to 1 MB, saved from Excel, Sheets or Numbers." />

      {existing > 0 ? (
        <FieldSet>
          <FieldLegend variant="label">The {plural(existing, "question")} already here</FieldLegend>
          <RadioGroup
            value={mode}
            onValueChange={(value) => changeMode(value as ImportMode)}
            className="grid gap-2 sm:grid-cols-2"
          >
            <FieldLabel htmlFor="csv-mode-append">
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>Keep them</FieldTitle>
                  <FieldDescription>The new rows go after them.</FieldDescription>
                </FieldContent>
                <RadioGroupItem value="append" id="csv-mode-append" />
              </Field>
            </FieldLabel>
            <FieldLabel htmlFor="csv-mode-replace">
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>Replace them</FieldTitle>
                  <FieldDescription>They’re deleted first. Sent tests keep their copy.</FieldDescription>
                </FieldContent>
                <RadioGroupItem value="replace" id="csv-mode-replace" />
              </Field>
            </FieldLabel>
          </RadioGroup>
        </FieldSet>
      ) : null}

      {check.isPending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Spinner /> Checking the file…
        </p>
      ) : null}

      {failure ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>{failure}</AlertTitle>
        </Alert>
      ) : null}

      {checked ? (
        <div className="flex flex-col gap-3" aria-live="polite">
          {checked.errors.length > 0 ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>
                {plural(checked.errors.length, "problem")} to fix. Correct the file, then choose it again.
              </AlertTitle>
              <AlertDescription>
                <IssueList issues={checked.errors} />
              </AlertDescription>
            </Alert>
          ) : checked.rowCount === 0 ? (
            <Alert variant="warning">
              <TriangleAlertIcon />
              <AlertTitle>The file has no question rows.</AlertTitle>
            </Alert>
          ) : (
            <Alert variant="success">
              <CircleCheckIcon />
              <AlertTitle>{plural(checked.rowCount, "question")} ready to import.</AlertTitle>
              {checked.newSections.length > 0 ? (
                <AlertDescription>New sections: {checked.newSections.join(", ")}.</AlertDescription>
              ) : null}
            </Alert>
          )}

          {checked.warnings.length > 0 ? (
            <Alert variant="warning">
              <TriangleAlertIcon />
              <AlertTitle>{plural(checked.warnings.length, "thing")} to know</AlertTitle>
              <AlertDescription>
                <IssueList issues={checked.warnings} />
              </AlertDescription>
            </Alert>
          ) : null}

          {checked.preview.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-14">Row</TableHead>
                    <TableHead className={WIDE_ONLY}>Type</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead className={cn("text-right", WIDE_ONLY)}>Options</TableHead>
                    <TableHead>Answer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checked.preview.slice(0, PREVIEW_ROWS).map((row) => (
                    <TableRow key={row.row} className={cn(errorRows.has(row.row) && "bg-destructive-soft")}>
                      <TableCell className="text-muted-foreground tabular-nums">{row.row}</TableCell>
                      <TableCell className={cn("text-muted-foreground", WIDE_ONLY)}>{TYPE_LABELS[row.type]}</TableCell>
                      <TableCell className="max-w-72 whitespace-normal">
                        <span className="line-clamp-2">{row.stem || "—"}</span>
                        <span className="text-xs text-muted-foreground">
                          {[row.ref, row.section].filter(Boolean).join(" · ")}
                          {row.media ? ` · audio ${row.mediaFound ? "found" : "to upload"}` : ""}
                        </span>
                      </TableCell>
                      <TableCell className={cn("text-right tabular-nums", WIDE_ONLY)}>{row.optionCount}</TableCell>
                      <TableCell className="font-medium">{row.correctLabel ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {checked.preview.length > PREVIEW_ROWS ? (
                <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                  Showing the first {PREVIEW_ROWS} of {checked.preview.length} rows.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="button"
          variant={mode === "replace" && existing > 0 ? "destructive" : "default"}
          disabled={!ready || !file || commit.isPending || check.isPending}
          onClick={() => file && commit.mutate({ file, mode })}
        >
          {commit.isPending ? <Spinner data-icon="inline-start" /> : null}
          {ready
            ? `${mode === "replace" && existing > 0 ? "Replace with" : "Import"} ${plural(checked.rowCount, "question")}`
            : "Import"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function where(issue: CsvIssue): string | null {
  if (issue.row === null) return null;
  return issue.column ? `Row ${issue.row}, ${issue.column}` : `Row ${issue.row}`;
}

function IssueList({ issues }: { issues: CsvIssue[] }) {
  const shown = issues.slice(0, ISSUES_SHOWN);
  return (
    <ul className="mt-1 flex flex-col gap-0.5">
      {shown.map((issue, index) => {
        const place = where(issue);
        return (
          <li key={`${issue.row}-${issue.column}-${index}`}>
            {place ? <span className="font-medium">{place}: </span> : null}
            {issue.message}
          </li>
        );
      })}
      {issues.length > shown.length ? <li>And {issues.length - shown.length} more.</li> : null}
    </ul>
  );
}
