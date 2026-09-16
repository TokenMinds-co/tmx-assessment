"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { importAssessment } from "@/lib/api/assessments";
import { ApiError, errorMessage } from "@/lib/api/client";
import { plural } from "@/lib/format";
import { assessmentKeys } from "@/lib/query-keys";

interface Summary {
  name: string;
  questions: number;
}

/** Imports a whole test from the JSON that "Export JSON" downloads. */
export function ImportJsonDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open ? <ImportJsonForm onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ImportJsonForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [document, setDocument] = useState<Record<string, unknown> | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [slug, setSlug] = useState("");
  const [readError, setReadError] = useState<string>();

  const importing = useMutation({
    mutationFn: (body: Record<string, unknown>) => importAssessment(body),
    onSuccess: (detail) => {
      queryClient.setQueryData(assessmentKeys.detail(detail.id), detail);
      void queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
      onDone();
      router.push(`/assessments/${detail.id}`);
    },
  });

  async function choose(next: File | null) {
    setFile(next);
    setDocument(null);
    setSummary(null);
    setReadError(undefined);
    importing.reset();
    if (!next) return;
    try {
      const parsed: unknown = JSON.parse(await next.text());
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error();
      const value = parsed as Record<string, unknown>;
      setDocument(value);
      setSlug(typeof value.slug === "string" ? value.slug : "");
      setSummary({
        name: typeof value.name === "string" ? value.name : "Untitled test",
        questions: Array.isArray(value.questions) ? value.questions.length : 0,
      });
    } catch {
      setReadError("That file isn’t a test in JSON. Export a test from the library to see the format.");
    }
  }

  const problems = importing.error instanceof ApiError ? importing.error.messages : [];

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>Import a test</DialogTitle>
        <DialogDescription>
          Use a JSON file from “Export JSON”, from this app or another one. It arrives as a draft.
        </DialogDescription>
      </DialogHeader>

      <FileDrop accept=".json,application/json" file={file} onFile={(next) => void choose(next)} hint="A .json file, up to 100 KB." />

      {readError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>{readError}</AlertTitle>
        </Alert>
      ) : null}

      {summary ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{summary.name}</span>
            <span className="text-muted-foreground"> · {plural(summary.questions, "question")}</span>
          </p>
          <Field>
            <FieldLabel htmlFor="import-slug">Slug</FieldLabel>
            <Input id="import-slug" value={slug} onChange={(event) => setSlug(event.target.value)} />
            <FieldDescription>Each test needs its own. Change it if the test is already in the library.</FieldDescription>
          </Field>
        </div>
      ) : null}

      {importing.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>The test wasn’t imported</AlertTitle>
          <AlertDescription>
            {problems.length > 1 ? (
              <ul className="ml-4 list-disc">
                {problems.slice(0, 8).map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
                {problems.length > 8 ? <li>And {problems.length - 8} more.</li> : null}
              </ul>
            ) : (
              errorMessage(importing.error)
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          onClick={() => document && importing.mutate({ ...document, slug: slug.trim() })}
          disabled={!document || importing.isPending}
        >
          {importing.isPending ? <Spinner data-icon="inline-start" /> : null}
          Import
        </Button>
      </DialogFooter>
    </div>
  );
}
