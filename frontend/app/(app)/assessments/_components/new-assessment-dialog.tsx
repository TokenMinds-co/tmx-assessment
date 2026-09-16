"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/shared/form-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { createAssessment, type ScoringMethod } from "@/lib/api/assessments";
import { errorMessage } from "@/lib/api/client";
import { assessmentKeys } from "@/lib/query-keys";

/** Starts a new draft test and opens it in the editor. */
export function NewAssessmentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open ? <NewAssessmentForm onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function NewAssessmentForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [method, setMethod] = useState<ScoringMethod>("CORRECT_ANSWER");
  const [minutes, setMinutes] = useState("15");
  const [errors, setErrors] = useState<{ name?: string; minutes?: string }>({});

  const create = useMutation({
    mutationFn: createAssessment,
    onSuccess: (detail) => {
      queryClient.setQueryData(assessmentKeys.detail(detail.id), detail);
      void queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
      onDone();
      router.push(`/assessments/${detail.id}`);
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const duration = Number(minutes);
    const next = {
      name: name.trim() ? undefined : "Give the test a name.",
      minutes:
        Number.isInteger(duration) && duration >= 1 && duration <= 240
          ? undefined
          : "Use a whole number of minutes, from 1 to 240.",
    };
    setErrors(next);
    if (next.name || next.minutes) return;
    create.mutate({ name: name.trim(), scoringMethod: method, durationMinutes: duration });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>New test</DialogTitle>
        <DialogDescription>It starts as a draft. Add questions, then publish it to send it.</DialogDescription>
      </DialogHeader>

      <FieldGroup className="gap-5">
        <FormError message={create.error ? errorMessage(create.error) : undefined} />

        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor="new-test-name">Name</FieldLabel>
          <Input
            id="new-test-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Attention to Detail"
            autoComplete="off"
            aria-invalid={errors.name ? true : undefined}
          />
          <FieldError>{errors.name}</FieldError>
        </Field>

        <FieldSet>
          <FieldLegend variant="label">How it’s scored</FieldLegend>
          <RadioGroup value={method} onValueChange={(value) => setMethod(value as ScoringMethod)}>
            <FieldLabel htmlFor="method-correct">
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>Skills test</FieldTitle>
                  <FieldDescription>Every question has a right answer. Scored by how many are correct.</FieldDescription>
                </FieldContent>
                <RadioGroupItem value="CORRECT_ANSWER" id="method-correct" />
              </Field>
            </FieldLabel>
            <FieldLabel htmlFor="method-alignment">
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>Preferences questionnaire</FieldTitle>
                  <FieldDescription>
                    No right answers. Scored by how closely answers match the role profile, like
                    Motivation.
                  </FieldDescription>
                </FieldContent>
                <RadioGroupItem value="ALIGNMENT" id="method-alignment" />
              </Field>
            </FieldLabel>
          </RadioGroup>
        </FieldSet>

        <Field data-invalid={errors.minutes ? true : undefined}>
          <FieldLabel htmlFor="new-test-minutes">Time limit, in minutes</FieldLabel>
          <Input
            id="new-test-minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={240}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            className="w-28"
            aria-invalid={errors.minutes ? true : undefined}
          />
          <FieldError>{errors.minutes}</FieldError>
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? <Spinner data-icon="inline-start" /> : null}
          Create test
        </Button>
      </DialogFooter>
    </form>
  );
}
